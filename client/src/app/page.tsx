"use client";

import Image from 'next/image'
import Script from 'next/script'
import Sessions from './sessions'
import Link from 'next/link';

const Home = () => (
  <div className='flex flex-col justify-center w-fit mx-auto'>
    <Link className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-fit mx-auto block mb-10" href="/game?id=0">Play</Link>
    <Sessions />
  </div>
)

export default Home;

