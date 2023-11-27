import type { Metadata } from 'next'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import './globals.css'
import { getPublicPath } from './util'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pong Multiplayer with Golang',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className + " w-full flex flex-col justify-start min-h-screen bg-blue-400 font-mono select-none text-white"}>
        <div className="my-8 px-4 mx-auto  flex flex-col justify-center text-center max-w-2xl text-white drop-shadow-md">
          <div className="flex flex-row flex-1 items-center justify-center">
            <h1 className="font-extrabold text-2xl mb-2">Pong Multiplayer with Golang.</h1>
            <Image src={getPublicPath("gopher.svg")} alt="Github" width="36" height="36" className='md:inline hidden' />
          </div>
          <p className="md:text-base text-sm">My first project with Golang, created over the course of a few days. It&apos;s a
            simple pong
            game with multiplayer
            support.</p>
        </div>
        {children}
      </body>
    </html>
  )
}
