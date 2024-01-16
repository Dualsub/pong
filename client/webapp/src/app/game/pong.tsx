'use client';

import Script from 'next/script'
import { getPublicPath } from '../util';

const Pong = () => <>
  {typeof window !== 'undefined' && (
    <>
      <canvas id="canvas" className="w-full h-full" width={window.innerWidth} height={window.innerHeight}></canvas>
      <Script src={getPublicPath("pong.js")} strategy="afterInteractive" />
    </>)}
</>;

export default Pong;
