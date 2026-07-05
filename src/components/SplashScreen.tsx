import { motion } from 'motion/react'

export function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <motion.img
        src="/logo.svg"
        alt="Life Assistant"
        className="h-16 w-16 rounded-2xl"
        animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
