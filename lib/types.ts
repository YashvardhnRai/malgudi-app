export interface Outlet {
  id: string
  name: string
  city: string
  country: string
  manager_name: string | null
  manager_phone: string | null
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'CEO' | 'MANAGER' | 'STAFF'
  outlet_id: string | null
  phone: string | null
  created_at: string
}

export interface ChecklistSubmission {
  id: string
  outlet_id: string
  submitted_by: string | null
  checklist_type: 'OPENING' | 'BANMARIE' | 'CLEANLINESS' | 'CLOSING'
  submission_time: string
  status: 'SUBMITTED' | 'LATE' | 'MISSED'
  notes: string | null
  created_at: string
}

export interface PhotoUpload {
  id: string
  outlet_id: string
  submitted_by: string | null
  category: 'FOOD_QUALITY' | 'BANMARIE' | 'CLEANLINESS' | 'RAW_MATERIAL' | 'CLOSING' | 'DISH_AUDIT'
  photo_url: string
  caption: string | null
  ai_status: 'PENDING' | 'APPROVED' | 'FLAGGED'
  ai_notes: string | null
  created_at: string
}

export interface ChecklistItem {
  id: string
  submission_id: string
  item_name: string
  is_completed: boolean
  photo_url: string | null
  notes: string | null
}

export interface Complaint {
  id: string
  outlet_id: string
  source: 'SWIGGY' | 'ZOMATO' | 'DIRECT' | 'GOOGLE'
  complaint_text: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  reported_at: string
  resolved_at: string | null
}

export interface DailySales {
  id: string
  outlet_id: string
  date: string
  total_sales: number
  covers_count: number
  swiggy_orders: number
  zomato_orders: number
  dine_in_orders: number
  created_at: string
}

export interface ShiftAttendance {
  id: string
  outlet_id: string
  user_id: string | null
  user_email: string
  user_name: string
  role: 'CEO' | 'MANAGER' | 'STAFF'
  shift_date: string
  status: 'CHECKED_IN' | 'CHECKED_OUT'
  check_in_at: string
  check_out_at: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface InventoryLog {
  id: string
  outlet_id: string
  recorded_by: string | null
  item_name: string
  category: string
  unit: string
  opening_qty: number
  used_qty: number
  wasted_qty: number
  closing_qty: number
  note: string | null
  log_date: string
  created_at: string
}

export interface CounterTemperatureReading {
  id: string
  round_id: string
  item_key: 'BATTER' | 'COCONUT_CHUTNEY' | 'RED_CHUTNEY' | 'SAMBAR' | 'COUNTER'
  temperature_c: number | null
  photo_upload_id: string | null
  photo_url: string | null
  created_at: string
}

export interface CounterTemperatureRound {
  id: string
  outlet_id: string
  submitted_by: string | null
  submitted_by_email: string
  round_date: string
  slot_key: string
  scheduled_at: string
  submitted_at: string
  status: 'SUBMITTED' | 'LATE'
  note: string | null
  created_at: string
  readings: CounterTemperatureReading[]
}

export interface Alert {
  id: string
  outlet_id: string | null
  alert_type: string
  message: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  is_read: boolean
  created_at: string
}

export type OutletStatus = 'GREEN' | 'AMBER' | 'RED'

export interface OutletWithStatus extends Outlet {
  status: OutletStatus
  last_update: string | null
  today_sales: number
  complaint_count: number
  checklists_done: number
  checklists_total: number
}

export interface DashboardSummary {
  total_sales: number
  total_complaints: number
  compliance_rate: number
  photos_uploaded: number
  alerts: Alert[]
  outlets: OutletWithStatus[]
  recent_photos: PhotoUpload[]
}

export interface OutletDetail {
  outlet: Outlet
  checklists: ChecklistSubmission[]
  photos: PhotoUpload[]
  sales: DailySales | null
  complaints: Complaint[]
  attendance?: ShiftAttendance[]
  inventory?: InventoryLog[]
  counter_rounds?: CounterTemperatureRound[]
  compliance_history: { date: string; rate: number }[]
}

export interface TaskScheduleItem {
  time: string
  label: string
  type: 'OPENING' | 'BANMARIE' | 'CLEANLINESS' | 'CLOSING'
  dueHour: number
  dueMinute: number
}
