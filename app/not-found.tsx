import Link from 'next/link'
import { ArrowLeft, MapPinOff } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="system-state-page">
      <MapPinOff size={36} />
      <span>404</span>
      <h1>This route is not on today&apos;s board.</h1>
      <p>Return to Malgudi Operations and continue from your assigned workspace.</p>
      <Link href="/">
        <ArrowLeft size={17} />
        Back to operations
      </Link>
    </main>
  )
}
