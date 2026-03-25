import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Page not found</h2>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link href="/help-center">
          <Button>Go to Help Center</Button>
        </Link>
      </div>
    </div>
  )
}
