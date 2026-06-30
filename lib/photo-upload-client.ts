'use client'

import type { PhotoUpload } from '@/lib/types'
import type { CounterRoundItemKey } from '@/lib/counter-rounds'

const DB_NAME = 'malgudi-operations'
const STORE_NAME = 'pending-photo-uploads'
const COUNTER_STORE_NAME = 'pending-counter-rounds'
const DB_VERSION = 2
const MAX_IMAGE_EDGE = 1400
const MAX_COMPRESSED_BYTES = 600_000
const JPEG_QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.42]

type QueuedFile = {
  name: string
  type: string
  blob: Blob
}

type QueuedUpload = {
  id: string
  createdAt: number
  outletId: string
  category: PhotoUpload['category']
  caption: string
  slotKey: string | null
  files: QueuedFile[]
}

type QueuedCounterRound = {
  id: string
  createdAt: number
  outletId: string
  slotKey: string
  note: string
  items: Array<{
    itemKey: CounterRoundItemKey
    temperatureC: number | null
    file: QueuedFile
  }>
}

export type PhotoUploadPayload = {
  outletId: string
  category: PhotoUpload['category']
  caption: string
  slotKey?: string | null
  files: File[]
}

export type PhotoUploadResult = {
  queued: boolean
  data: {
    id?: string
    url?: string
    aiStatus?: 'APPROVED' | 'FLAGGED' | 'PENDING'
    aiNotes?: string
    uploads?: unknown[]
  } | null
}

export type CounterRoundPayload = {
  outletId: string
  slotKey: string
  note: string
  items: Array<{
    itemKey: CounterRoundItemKey
    temperatureC: number | null
    file: File
  }>
}

export type CounterRoundResult = {
  queued: boolean
  data: { round?: unknown } | null
}

class UploadHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      if (!request.result.objectStoreNames.contains(COUNTER_STORE_NAME)) {
        request.result.createObjectStore(COUNTER_STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function completeTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function addQueuedUpload(upload: QueuedUpload) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).put(upload)
  await completeTransaction(transaction)
  database.close()
}

async function readQueuedUploads() {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const request = transaction.objectStore(STORE_NAME).getAll()
  const uploads = await new Promise<QueuedUpload[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as QueuedUpload[])
    request.onerror = () => reject(request.error)
  })
  await completeTransaction(transaction)
  database.close()
  return uploads.sort((a, b) => a.createdAt - b.createdAt)
}

async function removeQueuedUpload(id: string) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).delete(id)
  await completeTransaction(transaction)
  database.close()
}

async function addQueuedCounterRound(round: QueuedCounterRound) {
  const database = await openDatabase()
  const transaction = database.transaction(COUNTER_STORE_NAME, 'readwrite')
  transaction.objectStore(COUNTER_STORE_NAME).put(round)
  await completeTransaction(transaction)
  database.close()
}

async function readQueuedCounterRounds() {
  const database = await openDatabase()
  const transaction = database.transaction(COUNTER_STORE_NAME, 'readonly')
  const request = transaction.objectStore(COUNTER_STORE_NAME).getAll()
  const rounds = await new Promise<QueuedCounterRound[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as QueuedCounterRound[])
    request.onerror = () => reject(request.error)
  })
  await completeTransaction(transaction)
  database.close()
  return rounds.sort((a, b) => a.createdAt - b.createdAt)
}

async function removeQueuedCounterRound(id: string) {
  const database = await openDatabase()
  const transaction = database.transaction(COUNTER_STORE_NAME, 'readwrite')
  transaction.objectStore(COUNTER_STORE_NAME).delete(id)
  await completeTransaction(transaction)
  database.close()
}

async function compressPhoto(file: File) {
  if (!file.type.startsWith('image/') || file.size <= MAX_COMPRESSED_BYTES) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    let width = Math.max(1, Math.round(bitmap.width * scale))
    let height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    let smallest: Blob | null = null

    for (const quality of JPEG_QUALITIES) {
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) break
      context.drawImage(bitmap, 0, 0, width, height)
      const candidate = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      )
      if (candidate && (!smallest || candidate.size < smallest.size)) {
        smallest = candidate
      }
      if (candidate && candidate.size <= MAX_COMPRESSED_BYTES) break
      width = Math.max(1, Math.round(width * 0.86))
      height = Math.max(1, Math.round(height * 0.86))
    }
    bitmap.close()

    if (!smallest || smallest.size >= file.size) return file
    return new File([smallest], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}

function buildFormData(upload: {
  outletId: string
  category: PhotoUpload['category']
  caption: string
  slotKey?: string | null
  files: Array<File | QueuedFile>
}) {
  const formData = new FormData()
  for (const file of upload.files) {
    if (file instanceof File) {
      formData.append('photos', file)
    } else {
      formData.append('photos', file.blob, file.name)
    }
  }
  formData.append('outlet_id', upload.outletId)
  formData.append('category', upload.category)
  formData.append('caption', upload.caption)
  if (upload.slotKey) formData.append('slot_key', upload.slotKey)
  return formData
}

async function sendUpload(upload: {
  outletId: string
  category: PhotoUpload['category']
  caption: string
  slotKey?: string | null
  files: Array<File | QueuedFile>
}): Promise<NonNullable<PhotoUploadResult['data']>> {
  const response = await fetch('/api/photos', {
    method: 'POST',
    body: buildFormData(upload),
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    [key: string]: unknown
  }
  if (!response.ok) {
    throw new UploadHttpError(data.error || 'Upload failed', response.status)
  }
  return data as NonNullable<PhotoUploadResult['data']>
}

function buildCounterRoundFormData(round: {
  outletId: string
  slotKey: string
  note: string
  items: Array<{
    itemKey: CounterRoundItemKey
    temperatureC: number | null
    file: File | QueuedFile
  }>
}) {
  const formData = new FormData()
  formData.append('outlet_id', round.outletId)
  formData.append('slot_key', round.slotKey)
  formData.append('note', round.note)
  formData.append(
    'readings',
    JSON.stringify(
      round.items.map((item) => ({
        item_key: item.itemKey,
        temperature_c: item.temperatureC,
      }))
    )
  )
  for (const item of round.items) {
    if (item.file instanceof File) {
      formData.append(`photo_${item.itemKey}`, item.file)
    } else {
      formData.append(`photo_${item.itemKey}`, item.file.blob, item.file.name)
    }
  }
  return formData
}

async function sendCounterRound(round: {
  outletId: string
  slotKey: string
  note: string
  items: Array<{
    itemKey: CounterRoundItemKey
    temperatureC: number | null
    file: File | QueuedFile
  }>
}) {
  const response = await fetch('/api/counter-rounds', {
    method: 'POST',
    body: buildCounterRoundFormData(round),
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    round?: unknown
  }
  if (!response.ok) {
    throw new UploadHttpError(data.error || 'Counter round failed', response.status)
  }
  return data
}

export async function submitPhotoUpload(
  payload: PhotoUploadPayload
): Promise<PhotoUploadResult> {
  const files = await Promise.all(payload.files.map(compressPhoto))

  try {
    const data = await sendUpload({ ...payload, files })
    return { queued: false, data }
  } catch (error) {
    if (
      error instanceof UploadHttpError ||
      navigator.onLine
    ) {
      throw error
    }

    const id = crypto.randomUUID()
    await addQueuedUpload({
      id,
      createdAt: Date.now(),
      outletId: payload.outletId,
      category: payload.category,
      caption: payload.caption,
      slotKey: payload.slotKey ?? null,
      files: files.map((file) => ({
        name: file.name,
        type: file.type,
        blob: file,
      })),
    })
    window.dispatchEvent(new CustomEvent('malgudi-upload-queued'))
    return { queued: true, data: null }
  }
}

export async function flushPendingPhotoUploads() {
  if (!navigator.onLine) return { sent: 0, remaining: await getPendingUploadCount() }

  const uploads = await readQueuedUploads()
  let sent = 0
  for (const upload of uploads) {
    try {
      await sendUpload(upload)
      await removeQueuedUpload(upload.id)
      sent += 1
    } catch (error) {
      if (error instanceof UploadHttpError && error.status >= 400 && error.status < 500) {
        await removeQueuedUpload(upload.id)
      }
    }
  }

  const remaining = await getPendingUploadCount()
  window.dispatchEvent(
    new CustomEvent('malgudi-upload-sync', { detail: { sent, remaining } })
  )
  return { sent, remaining }
}

export async function getPendingUploadCount() {
  try {
    return (await readQueuedUploads()).length
  } catch {
    return 0
  }
}

export async function submitCounterRound(
  payload: CounterRoundPayload
): Promise<CounterRoundResult> {
  const compressedItems = await Promise.all(
    payload.items.map(async (item) => ({
      ...item,
      file: await compressPhoto(item.file),
    }))
  )

  try {
    const data = await sendCounterRound({ ...payload, items: compressedItems })
    return { queued: false, data }
  } catch (error) {
    if (error instanceof UploadHttpError || navigator.onLine) throw error

    await addQueuedCounterRound({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      outletId: payload.outletId,
      slotKey: payload.slotKey,
      note: payload.note,
      items: compressedItems.map((item) => ({
        itemKey: item.itemKey,
        temperatureC: item.temperatureC,
        file: {
          name: item.file.name,
          type: item.file.type,
          blob: item.file,
        },
      })),
    })
    window.dispatchEvent(new CustomEvent('malgudi-upload-queued'))
    return { queued: true, data: null }
  }
}

export async function flushPendingCounterRounds() {
  if (!navigator.onLine) {
    return { sent: 0, remaining: await getPendingCounterRoundCount() }
  }

  const rounds = await readQueuedCounterRounds()
  let sent = 0
  for (const round of rounds) {
    try {
      await sendCounterRound(round)
      await removeQueuedCounterRound(round.id)
      sent += 1
    } catch (error) {
      if (error instanceof UploadHttpError && error.status >= 400 && error.status < 500) {
        await removeQueuedCounterRound(round.id)
      }
    }
  }

  const remaining = await getPendingCounterRoundCount()
  window.dispatchEvent(
    new CustomEvent('malgudi-upload-sync', { detail: { sent, remaining } })
  )
  return { sent, remaining }
}

export async function getPendingCounterRoundCount() {
  try {
    return (await readQueuedCounterRounds()).length
  } catch {
    return 0
  }
}
