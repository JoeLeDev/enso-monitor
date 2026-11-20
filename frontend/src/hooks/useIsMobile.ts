import { useEffect, useState } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 600px)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 600px)')

    const update = () => setIsMobile(mediaQuery.matches)

    mediaQuery.addEventListener('change', update)

    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isMobile
}
