import 'server-only'

import {
  COUNTER_ROUND_ITEMS,
  COUNTER_ROUND_SLOTS,
  counterRoundMinutes,
} from '@/lib/counter-rounds'
import {
  decodeChecklistNotes,
  getIstDateRange,
  getIstParts,
  inferLegacySlotKey,
  OPERATIONS_SLOTS,
} from '@/lib/operations'
import { getSupabaseServerClient } from '@/lib/supabase'

type OutletRow = {
  id: string
  name: string
  city: string
  manager_name: string | null
  manager_phone: string | null
}

type SalesRow = {
  outlet_id: string
  total_sales: number | null
  covers_count: number | null
  swiggy_orders: number | null
  zomato_orders: number | null
  dine_in_orders: number | null
}

type ChecklistRow = {
  outlet_id: string
  checklist_type: 'OPENING' | 'BANMARIE' | 'CLEANLINESS' | 'CLOSING'
  notes: string | null
  status: string
  submission_time: string
  created_at: string
}

type PhotoRow = {
  outlet_id: string
  ai_status: string
  created_at: string
}

type ComplaintRow = {
  outlet_id: string
  severity: string
  status: string
  reported_at: string
}

type AlertRow = {
  outlet_id: string | null
  severity: string
  is_read: boolean
  created_at: string
}

type AttendanceRow = {
  outlet_id: string
  status: string
  user_email: string
}

type InventoryRow = {
  outlet_id: string
  item_name: string
  unit: string
  wasted_qty: number | null
  closing_qty: number | null
}

type CounterRoundRow = {
  id: string
  outlet_id: string
  slot_key: string
  status: string
  scheduled_at: string
}

type CounterReadingRow = {
  round_id: string
  item_key: string
  temperature_c: number | null
}

export type DailyOutletReport = {
  outlet_id: string
  outlet_name: string
  city: string
  manager_name: string | null
  manager_phone: string | null
  sales: number
  covers: number
  swiggy_orders: number
  zomato_orders: number
  dine_in_orders: number
  compliance_rate: number
  checks_done: number
  checks_expected: number
  counter_rounds_done: number
  counter_rounds_expected: number
  latest_temperatures: string[]
  photos: number
  flagged_photos: number
  complaints: number
  high_complaints: number
  unread_alerts: number
  attendance_checked_in: number
  attendance_checked_out: number
  wastage_entries: number
  wastage_qty: number
  top_wastage_items: string[]
  status: 'GREEN' | 'AMBER' | 'RED'
}

export type DailyReport = {
  date: string
  generated_at: string
  pending_migration: string[]
  totals: {
    outlets: number
    sales: number
    covers: number
    compliance_rate: number
    photos: number
    complaints: number
    high_complaints: number
    unread_alerts: number
    managers_checked_in: number
    wastage_qty: number
  }
  outlets: DailyOutletReport[]
}

function expectedSlotsForDate(date: string, now = new Date()) {
  const today = getIstParts(now).date
  if (date < today) return OPERATIONS_SLOTS
  if (date > today) return []

  const ist = getIstParts(now)
  const nowMinutes = ist.hour * 60 + ist.minute
  return OPERATIONS_SLOTS.filter((slot) => nowMinutes >= slot.hour * 60)
}

function expectedCounterSlotsForDate(date: string, now = new Date()) {
  const today = getIstParts(now).date
  if (date < today) return COUNTER_ROUND_SLOTS
  if (date > today) return []

  const ist = getIstParts(now)
  const nowMinutes = ist.hour * 60 + ist.minute
  return COUNTER_ROUND_SLOTS.filter(
    (slot) => nowMinutes >= counterRoundMinutes(slot)
  )
}

function sumNumber<T>(items: T[], getValue: (item: T) => number | null | undefined) {
  return items.reduce((sum, item) => sum + Number(getValue(item) ?? 0), 0)
}

function cleanTopWaste(items: InventoryRow[]) {
  return [...items]
    .filter((item) => Number(item.wasted_qty ?? 0) > 0)
    .sort((a, b) => Number(b.wasted_qty ?? 0) - Number(a.wasted_qty ?? 0))
    .slice(0, 3)
    .map((item) => `${item.item_name} ${Number(item.wasted_qty ?? 0)} ${item.unit}`)
}

function isMissingTableError(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205'
}

export async function buildDailyReport(date = getIstParts().date): Promise<DailyReport> {
  const supabase = getSupabaseServerClient()
  const { start, end } = getIstDateRange(new Date(`${date}T00:00:00+05:30`))
  const expectedSlots = expectedSlotsForDate(date)
  const expectedCounterSlots = expectedCounterSlotsForDate(date)
  const pendingMigration: string[] = []

  const [
    outletsRes,
    salesRes,
    checklistsRes,
    photosRes,
    complaintsRes,
    alertsRes,
    attendanceRes,
    inventoryRes,
    counterRoundsRes,
  ] = await Promise.all([
    supabase
      .from('outlets')
      .select('id, name, city, manager_name, manager_phone')
      .eq('is_active', true)
      .order('name'),
    supabase.from('daily_sales').select('*').eq('date', date),
    supabase
      .from('checklist_submissions')
      .select('outlet_id, checklist_type, notes, status, submission_time, created_at')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('photo_uploads')
      .select('outlet_id, ai_status, created_at')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('complaints')
      .select('outlet_id, severity, status, reported_at')
      .gte('reported_at', start)
      .lte('reported_at', end),
    supabase
      .from('alerts')
      .select('outlet_id, severity, is_read, created_at')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('shift_attendance')
      .select('outlet_id, status, user_email')
      .eq('shift_date', date),
    supabase
      .from('inventory_logs')
      .select('outlet_id, item_name, unit, wasted_qty, closing_qty')
      .eq('log_date', date),
    supabase
      .from('counter_temperature_rounds')
      .select('id, outlet_id, slot_key, status, scheduled_at')
      .eq('round_date', date),
  ])

  if (outletsRes.error) throw outletsRes.error
  if (salesRes.error) throw salesRes.error
  if (checklistsRes.error) throw checklistsRes.error
  if (photosRes.error) throw photosRes.error
  if (complaintsRes.error) throw complaintsRes.error
  if (alertsRes.error) throw alertsRes.error

  if (attendanceRes.error && isMissingTableError(attendanceRes.error)) {
    pendingMigration.push('shift_attendance')
  }
  else if (attendanceRes.error) throw attendanceRes.error

  if (inventoryRes.error && isMissingTableError(inventoryRes.error)) {
    pendingMigration.push('inventory_logs')
  }
  else if (inventoryRes.error) throw inventoryRes.error

  if (counterRoundsRes.error && isMissingTableError(counterRoundsRes.error)) {
    pendingMigration.push('counter_temperature_rounds')
  }
  else if (counterRoundsRes.error) throw counterRoundsRes.error

  const attendance = (attendanceRes.error ? [] : attendanceRes.data ?? []) as AttendanceRow[]
  const inventory = (inventoryRes.error ? [] : inventoryRes.data ?? []) as InventoryRow[]
  const counterRounds = (counterRoundsRes.error ? [] : counterRoundsRes.data ?? []) as CounterRoundRow[]
  const counterRoundIds = counterRounds.map((round) => round.id)
  const counterReadingsRes = counterRoundIds.length
    ? await supabase
        .from('counter_temperature_readings')
        .select('round_id, item_key, temperature_c')
        .in('round_id', counterRoundIds)
    : { data: [], error: null }
  if (counterReadingsRes.error && isMissingTableError(counterReadingsRes.error)) {
    pendingMigration.push('counter_temperature_readings')
  }
  else if (counterReadingsRes.error) throw counterReadingsRes.error
  const counterReadings = (counterReadingsRes.error
    ? []
    : counterReadingsRes.data ?? []) as CounterReadingRow[]

  const outlets = ((outletsRes.data ?? []) as OutletRow[]).map((outlet) => {
    const sales = ((salesRes.data ?? []) as SalesRow[]).filter(
      (row) => row.outlet_id === outlet.id
    )
    const checklists = ((checklistsRes.data ?? []) as ChecklistRow[]).filter(
      (row) => row.outlet_id === outlet.id
    )
    const photos = ((photosRes.data ?? []) as PhotoRow[]).filter(
      (row) => row.outlet_id === outlet.id
    )
    const complaints = ((complaintsRes.data ?? []) as ComplaintRow[]).filter(
      (row) => row.outlet_id === outlet.id
    )
    const alerts = ((alertsRes.data ?? []) as AlertRow[]).filter(
      (row) => row.outlet_id === outlet.id
    )
    const outletAttendance = attendance.filter((row) => row.outlet_id === outlet.id)
    const inventoryLogs = inventory.filter((row) => row.outlet_id === outlet.id)
    const outletCounterRounds = counterRounds.filter((row) => row.outlet_id === outlet.id)
    const completedSlotKeys = new Set(
      checklists
        .filter((checklist) => checklist.status !== 'MISSED')
        .map(
          (checklist) =>
            decodeChecklistNotes(checklist.notes).slotKey ?? inferLegacySlotKey(checklist)
        )
        .filter((key): key is string => Boolean(key))
    )

    const completedCounterKeys = new Set(outletCounterRounds.map((round) => round.slot_key))
    const counterRoundsDone = expectedCounterSlots.filter((slot) =>
      completedCounterKeys.has(slot.key)
    ).length
    const checksExpected = expectedSlots.length + expectedCounterSlots.length
    const checksDone =
      expectedSlots.filter((slot) => completedSlotKeys.has(slot.key)).length +
      counterRoundsDone
    const complianceRate = checksExpected
      ? Math.round((checksDone / checksExpected) * 100)
      : 100
    const highComplaints = complaints.filter((row) => row.severity === 'HIGH').length
    const flaggedPhotos = photos.filter((row) => row.ai_status === 'FLAGGED').length
    const unreadAlerts = alerts.filter((row) => !row.is_read).length
    const wastageQty = sumNumber(inventoryLogs, (row) => row.wasted_qty)
    const latestCounterRound = [...outletCounterRounds]
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0]
    const latestTemperatures = latestCounterRound
      ? counterReadings
          .filter(
            (reading) =>
              reading.round_id === latestCounterRound.id &&
              reading.temperature_c !== null
          )
          .map((reading) => {
            const item = COUNTER_ROUND_ITEMS.find(
              (candidate) => candidate.key === reading.item_key
            )
            return `${item?.shortLabel ?? reading.item_key} ${reading.temperature_c} C`
          })
      : []

    let status: DailyOutletReport['status'] = 'GREEN'
    if (complianceRate < 75 || highComplaints > 0 || flaggedPhotos > 0) status = 'RED'
    else if (complianceRate < 95 || complaints.length > 0 || unreadAlerts > 0 || wastageQty > 0) {
      status = 'AMBER'
    }

    return {
      outlet_id: outlet.id,
      outlet_name: outlet.name,
      city: outlet.city,
      manager_name: outlet.manager_name,
      manager_phone: outlet.manager_phone,
      sales: sumNumber(sales, (row) => row.total_sales),
      covers: sumNumber(sales, (row) => row.covers_count),
      swiggy_orders: sumNumber(sales, (row) => row.swiggy_orders),
      zomato_orders: sumNumber(sales, (row) => row.zomato_orders),
      dine_in_orders: sumNumber(sales, (row) => row.dine_in_orders),
      compliance_rate: complianceRate,
      checks_done: checksDone,
      checks_expected: checksExpected,
      counter_rounds_done: counterRoundsDone,
      counter_rounds_expected: expectedCounterSlots.length,
      latest_temperatures: latestTemperatures,
      photos: photos.length,
      flagged_photos: flaggedPhotos,
      complaints: complaints.length,
      high_complaints: highComplaints,
      unread_alerts: unreadAlerts,
      attendance_checked_in: new Set(outletAttendance.map((row) => row.user_email)).size,
      attendance_checked_out: outletAttendance.filter((row) => row.status === 'CHECKED_OUT')
        .length,
      wastage_entries: inventoryLogs.filter((row) => Number(row.wasted_qty ?? 0) > 0)
        .length,
      wastage_qty: wastageQty,
      top_wastage_items: cleanTopWaste(inventoryLogs),
      status,
    }
  })

  const totalExpectedChecks = outlets.reduce((sum, outlet) => sum + outlet.checks_expected, 0)
  const totalDoneChecks = outlets.reduce((sum, outlet) => sum + outlet.checks_done, 0)

  return {
    date,
    generated_at: new Date().toISOString(),
    pending_migration: pendingMigration,
    totals: {
      outlets: outlets.length,
      sales: sumNumber(outlets, (outlet) => outlet.sales),
      covers: sumNumber(outlets, (outlet) => outlet.covers),
      compliance_rate: totalExpectedChecks
        ? Math.round((totalDoneChecks / totalExpectedChecks) * 100)
        : 100,
      photos: sumNumber(outlets, (outlet) => outlet.photos),
      complaints: sumNumber(outlets, (outlet) => outlet.complaints),
      high_complaints: sumNumber(outlets, (outlet) => outlet.high_complaints),
      unread_alerts: sumNumber(outlets, (outlet) => outlet.unread_alerts),
      managers_checked_in: sumNumber(outlets, (outlet) => outlet.attendance_checked_in),
      wastage_qty: sumNumber(outlets, (outlet) => outlet.wastage_qty),
    },
    outlets,
  }
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export function dailyReportToCsv(report: DailyReport) {
  const header = [
    'Date',
    'Outlet',
    'City',
    'Status',
    'Sales',
    'Covers',
    'Dine In',
    'Swiggy',
    'Zomato',
    'Compliance',
    'Checks Done',
    'Checks Expected',
    'Counter Rounds Done',
    'Counter Rounds Expected',
    'Latest Temperatures',
    'Photos',
    'Flagged Photos',
    'Complaints',
    'High Complaints',
    'Unread Alerts',
    'Checked In',
    'Checked Out',
    'Wastage Qty',
    'Top Wastage',
    'Manager',
    'Manager Phone',
  ]

  const rows = report.outlets.map((outlet) => [
    report.date,
    outlet.outlet_name,
    outlet.city,
    outlet.status,
    outlet.sales,
    outlet.covers,
    outlet.dine_in_orders,
    outlet.swiggy_orders,
    outlet.zomato_orders,
    `${outlet.compliance_rate}%`,
    outlet.checks_done,
    outlet.checks_expected,
    outlet.counter_rounds_done,
    outlet.counter_rounds_expected,
    outlet.latest_temperatures.join('; '),
    outlet.photos,
    outlet.flagged_photos,
    outlet.complaints,
    outlet.high_complaints,
    outlet.unread_alerts,
    outlet.attendance_checked_in,
    outlet.attendance_checked_out,
    outlet.wastage_qty,
    outlet.top_wastage_items.join('; '),
    outlet.manager_name,
    outlet.manager_phone,
  ])

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}
