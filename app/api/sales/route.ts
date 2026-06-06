import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import { getIstParts } from '@/lib/operations'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isUuid } from '@/lib/validation'

type SalesBody = {
  outlet_id?: unknown
  date?: unknown
  total_sales?: unknown
  covers_count?: unknown
  swiggy_orders?: unknown
  zomato_orders?: unknown
  dine_in_orders?: unknown
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

const toNonNegativeNumber = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export async function GET(request: NextRequest) {
  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER'],
  })
  if (response || !actor) return response

  const { searchParams } = new URL(request.url)
  const requestedOutletId = searchParams.get('outlet_id')
  const outletId = actor.role === 'CEO' ? requestedOutletId : actor.outletId
  const date = searchParams.get('date') ?? getIstParts().date

  if ((requestedOutletId && !isUuid(requestedOutletId)) || !isDate(date)) {
    return NextResponse.json({ error: 'Invalid outlet or date' }, { status: 400 })
  }
  if (!isSupabaseConfigured) return NextResponse.json([])

  let query = getSupabaseServerClient().from('daily_sales').select('*').eq('date', date)
  if (outletId) query = query.eq('outlet_id', outletId)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Unable to load sales' }, { status: 503 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'sales:update', 20, 60_000)
  if (rateError) return rateError

  const parsed = await readJsonBody<SalesBody>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const body = parsed.data
  const outletId = body.outlet_id
  const date = body.date ?? getIstParts().date

  const totalSales = toNonNegativeNumber(body.total_sales)
  const coversCount = toNonNegativeNumber(body.covers_count)
  const swiggyOrders = toNonNegativeNumber(body.swiggy_orders)
  const zomatoOrders = toNonNegativeNumber(body.zomato_orders)
  const dineInOrders = toNonNegativeNumber(body.dine_in_orders)

  if (
    !isUuid(outletId) ||
    !isDate(date) ||
    [totalSales, coversCount, swiggyOrders, zomatoOrders, dineInOrders].some(
      (value) => value === null
    )
  ) {
    return NextResponse.json({ error: 'Valid sales totals are required' }, { status: 400 })
  }

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER'],
    outletId,
  })
  if (response || !actor) return response
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('daily_sales')
    .upsert(
      {
        outlet_id: outletId,
        date,
        total_sales: totalSales,
        covers_count: Math.floor(coversCount!),
        swiggy_orders: Math.floor(swiggyOrders!),
        zomato_orders: Math.floor(zomatoOrders!),
        dine_in_orders: Math.floor(dineInOrders!),
      },
      { onConflict: 'outlet_id,date' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Unable to save sales' }, { status: 400 })
  }

  await writeAuditEvent({
    actor,
    action: 'SALES_UPDATED',
    outletId,
    target: data.id,
    detail: { date, total_sales: totalSales },
  })

  return NextResponse.json(data, { status: 201 })
}
