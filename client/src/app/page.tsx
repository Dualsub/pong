"use client";

import Image from 'next/image'
import Sessions from './sessions'
import Link from 'next/link';
import { getPublicPath } from './util';

const Home = () => (
  <div className='flex flex-col justify-center w-fit mx-auto'>
    <div className='my-8 px-4 mx-auto grid grid-flow-col gap-2 grid-cols-2 justify-evenly text-center max-w-2xl text-white drop-shadow-md'>
      <Link className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full flex-1 mx-auto block mb-10" href="/game?id=0">Play</Link>
      <Link href="https://www.github.com/Dualsub/go-mp" className="bg-blue-500 flex flex-row flex-1 items-center hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full mx-auto mb-10">
        <Image src={getPublicPath("github-mark.svg")} alt="Github" width="16" height="16" />
        <span className="ml-2 whitespace-nowrap">Github Repo</span>
      </Link>
    </div>
    <Sessions />
  </div>
)

export default Home;

