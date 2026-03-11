import { Button } from '@/components/ui/button'
import type { Choice } from '@/types/conversation'

interface ChoiceButtonsProps {
  choices: Choice[]
  onSelect: (choice: Choice) => void
}

export function ChoiceButtons({ choices, onSelect }: ChoiceButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 ml-11">
      {choices.map((choice) => (
        <Button
          key={choice.id}
          variant="outline"
          size="sm"
          onClick={() => onSelect(choice)}
        >
          {choice.label}
        </Button>
      ))}
    </div>
  )
}
