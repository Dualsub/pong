import argparse
import asyncio
import websockets
import time
import random
import numpy as np


async def receive_state(websocket: websockets.WebSocketClientProtocol, duration: int) -> list:
    """Receive the state from the server"""

    start = time.time()
    times = []

    last_time = start
    # Receive the state for a set amount of time
    while (time.time() - start) < duration:
        remaining = max(duration - (time.time() - start), 0)
        try:
            # Await the message and measure the latency
            await asyncio.wait_for(websocket.recv(), timeout=remaining)
            now = time.time()
            times.append(now - last_time)
            last_time = now
        except asyncio.TimeoutError:
            break

    return times


async def run_client(uri, inputs, time) -> (float, int):
    """Run a single client and return the average latency and number of inputs sent"""

    websocket = await websockets.connect(uri)
    print(f'Connected to {uri}')
    result = await asyncio.gather(receive_state(websocket, time))
    print(f'Closing connection to {uri}')
    return result


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--uri', type=str, default='ws://localhost:5000')
    parser.add_argument('--games', type=int, default=100,
                        help='Number of game sessions to run, 2 players per game')
    parser.add_argument('--inputs', type=int, default=4,
                        help='Number of inputs per player per second')
    parser.add_argument('--time', type=int, default=10,
                        help='Number of seconds to run the test')

    args = parser.parse_args()

    # Run clients
    print(
        f'Running {args.games} games with {args.inputs} inputs per second for {args.time} seconds')

    # Generate game ids, uint32
    game_ids = np.random.randint(0, 2**32, args.games // 2)
    games = np.concatenate((game_ids, game_ids))
    games = np.random.permutation(games)

    start = time.time()
    loop = asyncio.get_event_loop()

    results = await asyncio.gather(
        *[run_client(f"{args.uri}/play?id={id}", args.inputs, args.time) for id in games])
    end = time.time()

    # Calculate the average latency and number of inputs sent
    total_latency = 0
    total_inputs = 0
    for result in results:
        for latency in result[0]:
            total_latency += latency
            total_inputs += 1

    print(
        f'Average latency: {round(total_latency * 10**3 / total_inputs, 3)} ms, {total_inputs} inputs sent')
    print(f'Total time: {round(end - start, 2)} seconds')


if __name__ == '__main__':
    asyncio.run(main())
