# Merge Number Game

A React-based slide merge number game similar to 2048, but with a maximum tile value of 1500. Numbers can only merge if their sum does not exceed 1500.

## How to Play

- Use arrow keys to slide tiles in any direction.
- When two tiles with the same number collide, they merge into their sum (if <= 1500).
- New tiles (2 or 4) appear randomly after each move.
- The game ends when no more moves are possible.

## Development

### Prerequisites

- Node.js (v18 or higher)

### Installation

```bash
npm install
```

### Running the Game

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```