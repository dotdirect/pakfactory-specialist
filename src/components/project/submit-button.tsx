import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface SubmitButtonProps {
  disabled?: boolean
  onClick?: () => void
}

export function SubmitButton({ disabled, onClick }: SubmitButtonProps) {
  return (
    <Button
      className="w-full"
      disabled={disabled}
      onClick={onClick}
    >
      <Send className="h-4 w-4 mr-2" />
      Submit Brief
    </Button>
  )
}
