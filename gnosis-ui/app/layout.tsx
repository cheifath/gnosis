import "./globals.css"
import { Providers } from "./providers"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (

    <html className="dark">
      <body className="bg-slate-950 text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>

  )
}