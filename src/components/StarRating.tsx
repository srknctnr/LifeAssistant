import { Star } from 'lucide-react'
import { motion } from 'motion/react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
}

export function StarRating({ value, onChange, size = 28 }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileTap={onChange ? { scale: 0.8 } : undefined}
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          aria-label={`${star} yıldız`}
          className={
            star <= value
              ? 'text-amber-400'
              : 'text-zinc-200 dark:text-zinc-700'
          }
        >
          <Star size={size} fill="currentColor" strokeWidth={0} />
        </motion.button>
      ))}
    </div>
  )
}
