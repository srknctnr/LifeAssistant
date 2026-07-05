import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  className?: string
}

export function AnimatedNumber({
  value,
  format,
  className,
}: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 90, damping: 22 })
  const display = useTransform(spring, (v) => format(v))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span className={className}>{display}</motion.span>
}
