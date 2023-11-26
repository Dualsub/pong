import Script from 'next/script'

const Game = () => <>
  <canvas id="game" width="800" height="600"
    className="mx-auto bg-black portrait:w-full max-w-full aspect-w-4 aspect-h-3 select-none"></canvas>
  <Script src="game.js" strategy="beforeInteractive" />
  <audio id="hit" src="./bong_001.ogg" preload="auto"></audio>
  <audio id="smash" src="./select_001.ogg" preload="auto"></audio>
  <audio id="win" src="./confirmation_002.ogg" preload="auto"></audio>
  <audio id="lose" src="./minimize_009.ogg" preload="auto"></audio>
</>;

export default Game;
