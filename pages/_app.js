import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <div className="smoke-video-bg" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto">
          <source src="/smoke-bg.mp4" type="video/mp4" />
        </video>
      </div>
      <Component {...pageProps} />
    </>
  )
}
