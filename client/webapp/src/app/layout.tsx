import type { Metadata } from 'next'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import './globals.css'
import { getPublicPath } from './util'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pong Multiplayer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏓</text></svg>"></link>
      </head>
      <body className={"w-full flex flex-col justify-start min-h-screen bg-background font-mono select-none text-white"}>
        {children}
      </body>
    </html>
  )
}
