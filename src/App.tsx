import { useState, useEffect, useCallback } from 'react'
import './App.css'

const SIZE = 4
const MAX_VALUE = 1500

type Grid = number[][]

const createEmptyGrid = (): Grid => Array(SIZE).fill(0).map(() => Array(SIZE).fill(0))

const addRandomTile = (grid: Grid): Grid => {
  const emptyCells: [number, number][] = []
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (grid[i][j] === 0) emptyCells.push([i, j])
    }
  }
  if (emptyCells.length === 0) return grid
  const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  const newGrid = grid.map(row => [...row])
  newGrid[x][y] = Math.random() < 0.9 ? 2 : 4
  return newGrid
}

const initialGrid = addRandomTile(addRandomTile(createEmptyGrid()))

const moveLeft = (row: number[]): { row: number[], score: number } => {
  const newRow = row.filter(x => x !== 0)
  let score = 0
  for (let i = 0; i < newRow.length - 1; i++) {
    if (newRow[i] === newRow[i + 1] && newRow[i] * 2 <= MAX_VALUE) {
      newRow[i] *= 2
      score += newRow[i]
      newRow[i + 1] = 0
    }
  }
  const finalRow = newRow.filter(x => x !== 0)
  while (finalRow.length < SIZE) finalRow.push(0)
  return { row: finalRow, score }
}

const moveRight = (row: number[]): { row: number[], score: number } => {
  const reversed = [...row].reverse()
  const { row: moved, score } = moveLeft(reversed)
  return { row: moved.reverse(), score }
}

const transpose = (grid: Grid): Grid => grid[0].map((_, i) => grid.map(row => row[i]))

const moveGrid = (grid: Grid, direction: string): { grid: Grid, score: number, moved: boolean } => {
  let newGrid = grid.map(row => [...row])
  let totalScore = 0
  let moved = false

  if (direction === 'left') {
    for (let i = 0; i < SIZE; i++) {
      const { row, score } = moveLeft(newGrid[i])
      newGrid[i] = row
      totalScore += score
      if (JSON.stringify(row) !== JSON.stringify(grid[i])) moved = true
    }
  } else if (direction === 'right') {
    for (let i = 0; i < SIZE; i++) {
      const { row, score } = moveRight(newGrid[i])
      newGrid[i] = row
      totalScore += score
      if (JSON.stringify(row) !== JSON.stringify(grid[i])) moved = true
    }
  } else if (direction === 'up') {
    newGrid = transpose(newGrid)
    const result = moveGrid(newGrid, 'left')
    newGrid = transpose(result.grid)
    totalScore = result.score
    moved = result.moved
  } else if (direction === 'down') {
    newGrid = transpose(newGrid)
    const result = moveGrid(newGrid, 'right')
    newGrid = transpose(result.grid)
    totalScore = result.score
    moved = result.moved
  }

  return { grid: newGrid, score: totalScore, moved }
}

const isGameOver = (grid: Grid): boolean => {
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (grid[i][j] === 0) return false
    }
  }
  // check if any move possible
  const directions = ['left', 'right', 'up', 'down']
  for (const dir of directions) {
    const { moved } = moveGrid(grid, dir)
    if (moved) return false
  }
  return true
}

function App() {
  const [grid, setGrid] = useState<Grid>(initialGrid)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null)

  const handleMove = useCallback((direction: string) => {
    if (gameOver) return
    const { grid: newGrid, score: moveScore, moved } = moveGrid(grid, direction)
    if (moved) {
      const gridWithTile = addRandomTile(newGrid)
      setGrid(gridWithTile)
      setScore(prev => prev + moveScore)
      if (isGameOver(gridWithTile)) {
        setGameOver(true)
      }
    }
  }, [grid, gameOver])

  const resetGame = () => {
    setGrid(addRandomTile(addRandomTile(createEmptyGrid())))
    setScore(0)
    setGameOver(false)
  }

  const fillRandomly = () => {
    const newGrid = grid.map(row => [...row])
    for (let i = 0; i < SIZE; i++) {
      const emptyCells = []
      for (let j = 0; j < SIZE; j++) {
        if (newGrid[i][j] === 0) emptyCells.push(j)
      }
      if (emptyCells.length > 0) {
        const randomCol = emptyCells[Math.floor(Math.random() * emptyCells.length)]
        newGrid[i][randomCol] = Math.random() < 0.9 ? 2 : 4
      }
    }
    setGrid(newGrid)
    setGameOver(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        handleMove('left')
        break
      case 'ArrowRight':
        e.preventDefault()
        handleMove('right')
        break
      case 'ArrowUp':
        e.preventDefault()
        handleMove('up')
        break
      case 'ArrowDown':
        e.preventDefault()
        handleMove('down')
        break
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const threshold = 30
    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) handleMove('right')
      else handleMove('left')
    } else {
      if (deltaY > 0) handleMove('down')
      else handleMove('up')
    }

    setTouchStart(null)
  }

  useEffect(() => {
    const gameDiv = document.querySelector('.game') as HTMLElement
    if (gameDiv) gameDiv.focus()
  }, [])

  return (
    <div className="game" onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} tabIndex={0}>
      <h1>Merge Number Game</h1>
      <div className="score">Score: {score}</div>
      {gameOver && <div className="game-over">Game Over!</div>}
      <div className="grid">
        {grid.map((row, i) => (
          <div key={i} className="row">
            {row.map((cell, j) => (
              <div key={j} className={`cell cell-${cell}`}>
                {cell !== 0 ? cell : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="buttons">
        <button className="restart-btn" onClick={resetGame}>Restart</button>
        <button className="fill-btn" onClick={fillRandomly} disabled={gameOver}>Fill Randomly</button>
      </div>
      <div className="instructions">
        Use arrow keys or swipe on mobile to move. Merge numbers up to 1500.
      </div>
    </div>
  )
}

export default App