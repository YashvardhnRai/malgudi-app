'use client'

import type { PhotoUpload } from '@/lib/types'

const DB_NAME = 'malgudi-operations'
const STORE_NAME = 'pending-photo-uploads'
const DB_VERSION = 1
const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.82

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

async function compressPhoto(file: File) {
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.size < 700_000
  ) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
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
