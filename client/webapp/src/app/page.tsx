"use client";

import Image from 'next/image'
import Sessions from './sessions'
import Link from 'next/link';
import { getPublicPath } from './util';

const Home = () => {

  const gameId = Math.floor(Math.random() * Math.pow(2, 32));
  return (
    <div className='flex flex-col w-fit mx-auto max-w-4xl min-h-screen'>
      <div className='w-full flex justify-center items-center mb-8 mt-12 flex-col text-center'>
        <h1 className='font-bold text-3xl w-fit mb-4'>Multiplayer 3D Pong 🏓</h1>
        <p className='text-sm max-w-3xl'>
          A project created for learning purposes. Client game written in C++ and compiled to WebAssembly using Emscripten. Graphics rendered with the new WebGPU-API. Game server written in Golang using Websockets.
          Please leave a <b>star</b> on <b>GitHub</b> if you can! 🌟
        </p>
      </div>
      <div className='my-8 px-4 mx-auto grid grid-flow-col gap-2 grid-cols-2 justify-evenly text-center max-w-2xl text-white drop-shadow-md'>
        <Link className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded w-full flex-1 block mb-10" href={`/game?id=${gameId}`}>Start Game</Link>
        <Link className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded w-full flex-1 block mb-10" href={`/game?id=${gameId}&ai=true`}>Play Against AI</Link>
        <Link className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded w-full flex-1 flex  mb-10 flex-row items-center" href="https://www.github.com/Dualsub/go-mp" >
          <Image src={getPublicPath("github-mark.svg")} alt="Github" width="16" height="16" />
          <span className="ml-2 whitespace-nowrap">Github Repo</span>
        </Link>
      </div>
      <Sessions />
      <div className='w-full text-center mt-auto mb-12 flex justify-center'>
        <p className='text-sm max-w-3xl opacity-50'>2024, Simon Sjöling</p>
      </div>
    </div>
  )
}

export default Home;

