import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: "window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};",
          }}
        />
        <script defer src="/_vercel/insights/script.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
