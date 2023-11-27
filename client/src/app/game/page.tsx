import Script from 'next/script'
import { getPublicPath } from '../util';

const Game = () => <>
  <canvas id="game" width="800" height="600"
    className="mx-auto bg-black portrait:w-full max-w-full aspect-w-4 aspect-h-3 select-none"></canvas>
  <Script src={getPublicPath("game.js")} strategy="afterInteractive" />
  <audio id="hit" src={getPublicPath("bong_001.ogg")} preload="auto"></audio>
  <audio id="smash" src={getPublicPath("select_001.ogg")} preload="auto"></audio>
  <audio id="win" src={getPublicPath("confirmation_002.ogg")} preload="auto"></audio>
  <audio id="lose" src={getPublicPath("minimize_009.ogg")} preload="auto"></audio>
</>;

export default Game;
