import type {
  Outlet,
  ChecklistSubmission,
  PhotoUpload,
  Complaint,
  DailySales,
  Alert,
  OutletWithStatus,
  DashboardSummary,
  OutletDetail,
} from './types'

const TODAY = '2026-04-29'

export const MOCK_OUTLETS: Outlet[] = [
  { id: 'outlet-bandra', name: 'Bandra', city: 'Mumbai', country: 'India', manager_name: 'Rajesh Kumar', manager_phone: '+91 98765 43210', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-juhu', name: 'Juhu', city: 'Mumbai', country: 'India', manager_name: 'Priya Sharma', manager_phone: '+91 98765 43211', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-andheri', name: 'Andheri', city: 'Mumbai', country: 'India', manager_name: 'Vikram Singh', manager_phone: '+91 98765 43212', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-powai', name: 'Powai', city: 'Mumbai', country: 'India', manager_name: 'Meera Patel', manager_phone: '+91 98765 43213', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-dadar', name: 'Dadar', city: 'Mumbai', country: 'India', manager_name: 'Suresh Nair', manager_phone: '+91 98765 43214', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-colaba', name: 'Colaba', city: 'Mumbai', country: 'India', manager_name: 'Lakshmi Iyer', manager_phone: '+91 98765 43215', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-cp', name: 'Connaught Place', city: 'Delhi', country: 'India', manager_name: 'Amit Verma', manager_phone: '+91 98765 43216', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-hk', name: 'Hauz Khas', city: 'Delhi', country: 'India', manager_name: 'Rohit Gupta', manager_phone: '+91 98765 43217', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-saket', name: 'Saket', city: 'Delhi', country: 'India', manager_name: 'Deepa Menon', manager_phone: '+91 98765 43218', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-dm', name: 'Dubai Mall', city: 'Dubai', country: 'UAE', manager_name: 'Ahmed Al-Rashid', manager_phone: '+971 50 123 4567', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-jbr', name: 'JBR', city: 'Dubai', country: 'UAE', manager_name: 'Fatima Hassan', manager_phone: '+971 50 234 5678', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-bb', name: 'Business Bay', city: 'Dubai', country: 'UAE', manager_name: 'Sanjay Patel', manager_phone: '+971 50 345 6789', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'outlet-difc', name: 'DIFC', city: 'Dubai', country: 'UAE', manager_name: 'Nisha Kapoor', manager_phone: '+971 50 456 7890', is_active: true, created_at: '2024-01-01T00:00:00Z' },
]

export const MOCK_SALES: DailySales[] = [
  { id: 's1', outlet_id: 'outlet-bandra', date: TODAY, total_sales: 52400, covers_count: 142, swiggy_orders: 28, zomato_orders: 22, dine_in_orders: 92, created_at: `${TODAY}T08:00:00Z` },
  { id: 's2', outlet_id: 'outlet-juhu', date: TODAY, total_sales: 48200, covers_count: 130, swiggy_orders: 24, zomato_orders: 18, dine_in_orders: 88, created_at: `${TODAY}T08:00:00Z` },
  { id: 's3', outlet_id: 'outlet-andheri', date: TODAY, total_sales: 38800, covers_count: 108, swiggy_orders: 32, zomato_orders: 26, dine_in_orders: 50, created_at: `${TODAY}T08:00:00Z` },
  { id: 's4', outlet_id: 'outlet-powai', date: TODAY, total_sales: 42100, covers_count: 118, swiggy_orders: 38, zomato_orders: 30, dine_in_orders: 50, created_at: `${TODAY}T08:00:00Z` },
  { id: 's5', outlet_id: 'outlet-dadar', date: TODAY, total_sales: 35600, covers_count: 98, swiggy_orders: 22, zomato_orders: 16, dine_in_orders: 60, created_at: `${TODAY}T08:00:00Z` },
  { id: 's6', outlet_id: 'outlet-colaba', date: TODAY, total_sales: 61300, covers_count: 168, swiggy_orders: 20, zomato_orders: 14, dine_in_orders: 134, created_at: `${TODAY}T08:00:00Z` },
  { id: 's7', outlet_id: 'outlet-cp', date: TODAY, total_sales: 74500, covers_count: 210, swiggy_orders: 42, zomato_orders: 34, dine_in_orders: 134, created_at: `${TODAY}T08:00:00Z` },
  { id: 's8', outlet_id: 'outlet-hk', date: TODAY, total_sales: 43800, covers_count: 122, swiggy_orders: 28, zomato_orders: 22, dine_in_orders: 72, created_at: `${TODAY}T08:00:00Z` },
  { id: 's9', outlet_id: 'outlet-saket', date: TODAY, total_sales: 38200, covers_count: 108, swiggy_orders: 26, zomato_orders: 18, dine_in_orders: 64, created_at: `${TODAY}T08:00:00Z` },
  { id: 's10', outlet_id: 'outlet-dm', date: TODAY, total_sales: 85600, covers_count: 220, swiggy_orders: 0, zomato_orders: 58, dine_in_orders: 162, created_at: `${TODAY}T08:00:00Z` },
  { id: 's11', outlet_id: 'outlet-jbr', date: TODAY, total_sales: 68400, covers_count: 188, swiggy_orders: 0, zomato_orders: 44, dine_in_orders: 144, created_at: `${TODAY}T08:00:00Z` },
  { id: 's12', outlet_id: 'outlet-bb', date: TODAY, total_sales: 71200, covers_count: 196, swiggy_orders: 0, zomato_orders: 48, dine_in_orders: 148, created_at: `${TODAY}T08:00:00Z` },
  { id: 's13', outlet_id: 'outlet-difc', date: TODAY, total_sales: 92300, covers_count: 240, swiggy_orders: 0, zomato_orders: 62, dine_in_orders: 178, created_at: `${TODAY}T08:00:00Z` },
]

export const MOCK_CHECKLISTS: ChecklistSubmission[] = [
  { id: 'cl-1', outlet_id: 'outlet-bandra', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:32:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:32:00Z` },
  { id: 'cl-2', outlet_id: 'outlet-bandra', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:30:00Z` },
  { id: 'cl-3', outlet_id: 'outlet-bandra', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:28:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:28:00Z` },
  { id: 'cl-4', outlet_id: 'outlet-bandra', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:32:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:32:00Z` },
  { id: 'cl-5', outlet_id: 'outlet-juhu', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:30:00Z` },
  { id: 'cl-6', outlet_id: 'outlet-juhu', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:32:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:32:00Z` },
  { id: 'cl-7', outlet_id: 'outlet-juhu', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:30:00Z` },
  { id: 'cl-8', outlet_id: 'outlet-juhu', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:30:00Z` },
  { id: 'cl-9', outlet_id: 'outlet-andheri', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:38:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:38:00Z` },
  { id: 'cl-10', outlet_id: 'outlet-andheri', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:40:00Z`, status: 'LATE', notes: 'Manager was busy with delivery', created_at: `${TODAY}T04:40:00Z` },
  { id: 'cl-11', outlet_id: 'outlet-andheri', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:31:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:31:00Z` },
  { id: 'cl-12', outlet_id: 'outlet-andheri', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:35:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:35:00Z` },
  // Powai missed a banmarie update
  { id: 'cl-13', outlet_id: 'outlet-powai', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:31:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:31:00Z` },
  { id: 'cl-14', outlet_id: 'outlet-powai', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:32:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:32:00Z` },
  { id: 'cl-15', outlet_id: 'outlet-powai', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:00:00Z`, status: 'MISSED', notes: null, created_at: `${TODAY}T06:00:00Z` },
  // Dadar - all good
  { id: 'cl-16', outlet_id: 'outlet-dadar', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:29:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:29:00Z` },
  { id: 'cl-17', outlet_id: 'outlet-dadar', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:30:00Z` },
  { id: 'cl-18', outlet_id: 'outlet-dadar', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:30:00Z` },
  { id: 'cl-19', outlet_id: 'outlet-dadar', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:30:00Z` },
  // Colaba
  { id: 'cl-20', outlet_id: 'outlet-colaba', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:35:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:35:00Z` },
  { id: 'cl-21', outlet_id: 'outlet-colaba', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:33:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:33:00Z` },
  { id: 'cl-22', outlet_id: 'outlet-colaba', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:32:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:32:00Z` },
  { id: 'cl-23', outlet_id: 'outlet-colaba', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:31:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:31:00Z` },
  // Hauz Khas - late opening
  { id: 'cl-24', outlet_id: 'outlet-hk', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T03:15:00Z`, status: 'LATE', notes: 'Staff came late', created_at: `${TODAY}T03:15:00Z` },
  { id: 'cl-25', outlet_id: 'outlet-hk', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:35:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:35:00Z` },
  { id: 'cl-26', outlet_id: 'outlet-hk', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:30:00Z` },
  // CP, Saket, Dubai outlets - all submitted
  { id: 'cl-27', outlet_id: 'outlet-cp', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:30:00Z` },
  { id: 'cl-28', outlet_id: 'outlet-cp', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:30:00Z` },
  { id: 'cl-29', outlet_id: 'outlet-cp', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:30:00Z` },
  { id: 'cl-30', outlet_id: 'outlet-cp', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:30:00Z` },
  { id: 'cl-31', outlet_id: 'outlet-saket', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:31:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:31:00Z` },
  { id: 'cl-32', outlet_id: 'outlet-saket', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:31:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:31:00Z` },
  { id: 'cl-33', outlet_id: 'outlet-saket', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:31:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:31:00Z` },
  // Business Bay - missed cleanliness
  { id: 'cl-34', outlet_id: 'outlet-bb', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:30:00Z` },
  { id: 'cl-35', outlet_id: 'outlet-bb', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:30:00Z` },
  { id: 'cl-36', outlet_id: 'outlet-bb', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:30:00Z` },
  // Dubai Mall, JBR, DIFC - all good
  { id: 'cl-37', outlet_id: 'outlet-dm', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:30:00Z` },
  { id: 'cl-38', outlet_id: 'outlet-dm', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:30:00Z` },
  { id: 'cl-39', outlet_id: 'outlet-dm', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:30:00Z` },
  { id: 'cl-40', outlet_id: 'outlet-dm', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:30:00Z` },
  { id: 'cl-41', outlet_id: 'outlet-jbr', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:30:00Z` },
  { id: 'cl-42', outlet_id: 'outlet-jbr', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:30:00Z` },
  { id: 'cl-43', outlet_id: 'outlet-jbr', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:30:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:30:00Z` },
  { id: 'cl-44', outlet_id: 'outlet-difc', submitted_by: null, checklist_type: 'OPENING', submission_time: `${TODAY}T02:28:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T02:28:00Z` },
  { id: 'cl-45', outlet_id: 'outlet-difc', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T04:28:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T04:28:00Z` },
  { id: 'cl-46', outlet_id: 'outlet-difc', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T06:28:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T06:28:00Z` },
  { id: 'cl-47', outlet_id: 'outlet-difc', submitted_by: null, checklist_type: 'BANMARIE', submission_time: `${TODAY}T08:28:00Z`, status: 'SUBMITTED', notes: null, created_at: `${TODAY}T08:28:00Z` },
]

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'comp-1', outlet_id: 'outlet-andheri', source: 'ZOMATO',
    complaint_text: 'Food was cold on delivery. Idly was hard and sambar had no flavour.',
    severity: 'LOW', status: 'OPEN',
    reported_at: `${TODAY}T04:30:00Z`, resolved_at: null,
  },
  {
    id: 'comp-2', outlet_id: 'outlet-bb', source: 'DIRECT',
    complaint_text: 'Extremely long wait time — over 45 minutes for dine-in. Staff were rude when asked.',
    severity: 'HIGH', status: 'OPEN',
    reported_at: `${TODAY}T05:15:00Z`, resolved_at: null,
  },
  {
    id: 'comp-3', outlet_id: 'outlet-juhu', source: 'SWIGGY',
    complaint_text: 'Rasam was watery and cold. Quantity was also less than expected.',
    severity: 'MEDIUM', status: 'RESOLVED',
    reported_at: `${TODAY}T02:00:00Z`, resolved_at: `${TODAY}T03:30:00Z`,
  },
]

export const MOCK_PHOTOS: PhotoUpload[] = [
  { id: 'ph-1', outlet_id: 'outlet-bandra', submitted_by: null, category: 'BANMARIE', photo_url: '', caption: 'Banmarie setup — 10 AM update', ai_status: 'APPROVED', ai_notes: 'Food looks fresh and properly maintained.', created_at: `${TODAY}T04:32:00Z` },
  { id: 'ph-2', outlet_id: 'outlet-cp', submitted_by: null, category: 'FOOD_QUALITY', photo_url: '', caption: 'Dosa line — morning batch', ai_status: 'APPROVED', ai_notes: 'Excellent presentation and color.', created_at: `${TODAY}T04:15:00Z` },
  { id: 'ph-3', outlet_id: 'outlet-powai', submitted_by: null, category: 'BANMARIE', photo_url: '', caption: 'Banmarie — sambar level low', ai_status: 'FLAGGED', ai_notes: 'Sambar level appears critically low. Immediate refill required.', created_at: `${TODAY}T06:10:00Z` },
  { id: 'ph-4', outlet_id: 'outlet-difc', submitted_by: null, category: 'CLEANLINESS', photo_url: '', caption: 'Kitchen after prep', ai_status: 'APPROVED', ai_notes: 'Kitchen is spotless and well-organized.', created_at: `${TODAY}T05:45:00Z` },
  { id: 'ph-5', outlet_id: 'outlet-colaba', submitted_by: null, category: 'DISH_AUDIT', photo_url: '', caption: 'Signature thali plating', ai_status: 'APPROVED', ai_notes: 'Presentation is excellent. Portions look correct.', created_at: `${TODAY}T07:20:00Z` },
  { id: 'ph-6', outlet_id: 'outlet-dm', submitted_by: null, category: 'BANMARIE', photo_url: '', caption: 'Dubai Mall banmarie 10 AM', ai_status: 'APPROVED', ai_notes: 'All items well stocked and presented.', created_at: `${TODAY}T04:30:00Z` },
  { id: 'ph-7', outlet_id: 'outlet-jbr', submitted_by: null, category: 'RAW_MATERIAL', photo_url: '', caption: 'Morning ingredient delivery', ai_status: 'APPROVED', ai_notes: 'Fresh ingredients, good quality.', created_at: `${TODAY}T03:00:00Z` },
  { id: 'ph-8', outlet_id: 'outlet-andheri', submitted_by: null, category: 'CLEANLINESS', photo_url: '', caption: 'Post-rush cleaning', ai_status: 'FLAGGED', ai_notes: 'Some areas under the counter need attention. Floor could be cleaner.', created_at: `${TODAY}T08:10:00Z` },
  { id: 'ph-9', outlet_id: 'outlet-hk', submitted_by: null, category: 'BANMARIE', photo_url: '', caption: 'Banmarie update 10 AM', ai_status: 'APPROVED', ai_notes: 'Good maintenance of temperatures.', created_at: `${TODAY}T04:35:00Z` },
  { id: 'ph-10', outlet_id: 'outlet-dadar', submitted_by: null, category: 'FOOD_QUALITY', photo_url: '', caption: 'Chutney prep — coconut fresh', ai_status: 'APPROVED', ai_notes: 'Freshly prepared, appropriate texture.', created_at: `${TODAY}T05:10:00Z` },
  { id: 'ph-11', outlet_id: 'outlet-saket', submitted_by: null, category: 'BANMARIE', photo_url: '', caption: 'Banmarie midday update', ai_status: 'APPROVED', ai_notes: 'All items properly maintained.', created_at: `${TODAY}T06:31:00Z` },
  { id: 'ph-12', outlet_id: 'outlet-bb', submitted_by: null, category: 'CLOSING', photo_url: '', caption: 'Kitchen closing check', ai_status: 'PENDING', ai_notes: null, created_at: `${TODAY}T08:00:00Z` },
]

export const MOCK_ALERTS: Alert[] = [
  { id: 'al-1', outlet_id: 'outlet-powai', alert_type: 'MISSED_CHECKLIST', message: '⚠ Powai missed Banmarie Update at 12:00 PM', severity: 'HIGH', is_read: false, created_at: `${TODAY}T06:30:00Z` },
  { id: 'al-2', outlet_id: 'outlet-bb', alert_type: 'COMPLAINT_UNRESOLVED', message: '🔴 Business Bay: HIGH severity complaint unresolved for 3+ hours', severity: 'CRITICAL', is_read: false, created_at: `${TODAY}T08:30:00Z` },
  { id: 'al-3', outlet_id: 'outlet-andheri', alert_type: 'PHOTO_FLAGGED', message: 'Andheri: AI flagged cleanliness photo — needs attention', severity: 'MEDIUM', is_read: false, created_at: `${TODAY}T08:12:00Z` },
  { id: 'al-4', outlet_id: 'outlet-hk', alert_type: 'LATE_CHECKLIST', message: 'Hauz Khas submitted Opening Checklist 45 min late', severity: 'LOW', is_read: true, created_at: `${TODAY}T03:16:00Z` },
]

function getChecklistsForOutlet(outletId: string): { done: number; total: number; hasMissed: boolean } {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const ist = new Date(now.getTime() + istOffset)
  const istHour = ist.getUTCHours()
  const istMinute = ist.getUTCMinutes()
  const currentMinutes = istHour * 60 + istMinute

  const schedule = [
    { hour: 8, minute: 0 }, { hour: 10, minute: 0 }, { hour: 12, minute: 0 },
    { hour: 14, minute: 0 }, { hour: 15, minute: 0 }, { hour: 16, minute: 0 },
    { hour: 18, minute: 0 }, { hour: 20, minute: 0 }, { hour: 22, minute: 0 },
    { hour: 23, minute: 0 },
  ]
  const dueCount = schedule.filter(s => s.hour * 60 + s.minute <= currentMinutes).length
  const submitted = MOCK_CHECKLISTS.filter(c => c.outlet_id === outletId && c.status !== 'MISSED')
  const missed = MOCK_CHECKLISTS.filter(c => c.outlet_id === outletId && c.status === 'MISSED')
  return { done: Math.min(submitted.length, dueCount), total: dueCount, hasMissed: missed.length > 0 }
}

function getLastUpdate(outletId: string): string {
  const photos = MOCK_PHOTOS.filter(p => p.outlet_id === outletId).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const checks = MOCK_CHECKLISTS.filter(c => c.outlet_id === outletId).sort((a, b) => b.submission_time.localeCompare(a.submission_time))
  const latest = [photos[0]?.created_at, checks[0]?.submission_time].filter(Boolean).sort().reverse()[0]
  if (!latest) return 'No updates'
  const now = new Date()
  const diff = Math.floor((now.getTime() - new Date(latest).getTime()) / 60000)
  if (diff > 720) return 'No updates today'
  if (diff < 60) return `${diff} min ago`
  return `${Math.floor(diff / 60)} hr ago`
}

export function getMockDashboard(): DashboardSummary {
  const outlets: OutletWithStatus[] = MOCK_OUTLETS.map(outlet => {
    const sales = MOCK_SALES.find(s => s.outlet_id === outlet.id)
    const complaints = MOCK_COMPLAINTS.filter(c => c.outlet_id === outlet.id && c.status !== 'RESOLVED')
    const checklists = getChecklistsForOutlet(outlet.id)
    let status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
    if (complaints.length > 0) {
      status = 'RED'
    } else if (sales && sales.total_sales > 0) {
      status = 'GREEN'
    } else {
      status = 'AMBER'
    }

    return {
      ...outlet,
      status,
      last_update: getLastUpdate(outlet.id),
      today_sales: sales?.total_sales ?? 0,
      complaint_count: complaints.length,
      checklists_done: checklists.done,
      checklists_total: checklists.total,
    }
  })

  const totalSales = MOCK_SALES.reduce((sum, s) => sum + s.total_sales, 0)
  const totalComplaints = MOCK_COMPLAINTS.filter(c => c.status !== 'RESOLVED').length
  const allChecklists = MOCK_CHECKLISTS.filter(c => c.status !== 'MISSED')
  const complianceRate = Math.round((allChecklists.filter(c => c.status === 'SUBMITTED').length / Math.max(allChecklists.length, 1)) * 100)

  return {
    total_sales: totalSales,
    total_complaints: totalComplaints,
    compliance_rate: complianceRate,
    photos_uploaded: MOCK_PHOTOS.length,
    alerts: MOCK_ALERTS.filter(a => !a.is_read),
    outlets,
    recent_photos: [...MOCK_PHOTOS].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12),
  }
}

export function getMockOutletDetail(outletId: string): OutletDetail | null {
  const outlet = MOCK_OUTLETS.find(o => o.id === outletId)
  if (!outlet) return null

  const checklists = MOCK_CHECKLISTS.filter(c => c.outlet_id === outletId)
  const photos = MOCK_PHOTOS.filter(p => p.outlet_id === outletId)
  const sales = MOCK_SALES.find(s => s.outlet_id === outletId) ?? null
  const complaints = MOCK_COMPLAINTS.filter(c => c.outlet_id === outletId)

  const compliance_history = [
    { date: '2026-04-22', rate: 92 },
    { date: '2026-04-23', rate: 88 },
    { date: '2026-04-24', rate: 100 },
    { date: '2026-04-25', rate: 95 },
    { date: '2026-04-26', rate: 100 },
    { date: '2026-04-27', rate: 90 },
    { date: TODAY, rate: 85 },
  ]

  return { outlet, checklists, photos, sales, complaints, compliance_history }
}
