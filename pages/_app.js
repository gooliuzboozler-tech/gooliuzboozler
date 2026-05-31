import '../styles/globals.css'
import { useEffect, useRef } from 'react'

function SmokeBackground() {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.45
    }
  }, [])

  return (
    <div className="smoke-video-bg" aria-hidden="true">
      <video ref={videoRef} autoPlay muted loop playsInline preload="auto">
        <source src="/smoke-bg.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <SmokeBackground />
      <Component {...pageProps} />
    </>
  )
}
