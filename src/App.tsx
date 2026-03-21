import { useState, useEffect, useCallback } from 'react'
import './App.css'

const SIZE = 4
const MAX_VALUE = 1500

let audioCtx: AudioContext | null = null
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

const playTone = (frequency: number, duration = 0.12, type: OscillatorType = 'sine', volume = 0.12) => {
  const ctx = getAudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  gainNode.gain.setValueAtTime(volume, ctx.currentTime)
  oscillator.start()
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  oscillator.stop(ctx.currentTime + duration)
}

const playMoveSound = () => {
  playTone(500, 0.08, 'triangle')
}

const playRecordSound = () => {
  playTone(780, 0.2, 'sawtooth')
  playTone(920, 0.18, 'sawtooth')
}

const playGameOverSound = () => {
  playTone(320, 0.3, 'square', 0.35)
  setTimeout(() => playTone(260, 0.26, 'square', 0.32), 120)
  setTimeout(() => playTone(200, 0.2, 'triangle', 0.28), 260)
}

const speakCongratulations = () => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('Wow, good job! You reached 128!')
    utterance.rate = 1.1
    utterance.pitch = 1.2
    window.speechSynthesis.speak(utterance)
  }
}

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
  const [maxScore, setMaxScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [reached128, setReached128] = useState(false)
  const [theme, setTheme] = useState<'classic' | 'block' | 'neon' | 'forest' | 'cyber'>('block')
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null)
  const [mergeCandidates, setMergeCandidates] = useState<Set<string>>(new Set())
  const [animatedCells, setAnimatedCells] = useState<Set<string>>(new Set())

  const getMergeCandidates = (grid: Grid, direction: 'left' | 'right' | 'up' | 'down'): Set<string> => {
    const candidates = new Set<string>()

    const mark = (i: number, j: number) => candidates.add(`${i}-${j}`)

    if (direction === 'left') {
      for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - 1; j++) {
          const val = grid[i][j]
          if (val !== 0 && val === grid[i][j + 1] && val * 2 <= MAX_VALUE) {
            mark(i, j)
            mark(i, j + 1)
          }
        }
      }
    } else if (direction === 'right') {
      for (let i = 0; i < SIZE; i++) {
        for (let j = SIZE - 1; j > 0; j--) {
          const val = grid[i][j]
          if (val !== 0 && val === grid[i][j - 1] && val * 2 <= MAX_VALUE) {
            mark(i, j)
            mark(i, j - 1)
          }
        }
      }
    } else if (direction === 'up') {
      for (let j = 0; j < SIZE; j++) {
        for (let i = 0; i < SIZE - 1; i++) {
          const val = grid[i][j]
          if (val !== 0 && val === grid[i + 1][j] && val * 2 <= MAX_VALUE) {
            mark(i, j)
            mark(i + 1, j)
          }
        }
      }
    } else if (direction === 'down') {
      for (let j = 0; j < SIZE; j++) {
        for (let i = SIZE - 1; i > 0; i--) {
          const val = grid[i][j]
          if (val !== 0 && val === grid[i - 1][j] && val * 2 <= MAX_VALUE) {
            mark(i, j)
            mark(i - 1, j)
          }
        }
      }
    }

    return candidates
  }

  const handleMove = useCallback((direction: string) => {
    if (gameOver) return
    const { grid: newGrid, score: moveScore, moved } = moveGrid(grid, direction)
    if (moved) {
      const gridWithTile = addRandomTile(newGrid)
      const updatedCells = new Set<string>()
      for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
          if (gridWithTile[i][j] !== 0 && gridWithTile[i][j] !== grid[i][j]) {
            updatedCells.add(`${i}-${j}`)
          }
        }
      }

      const newScore = score + moveScore
      setGrid(gridWithTile)
      setScore(newScore)
      setAnimatedCells(updatedCells)
      setTimeout(() => setAnimatedCells(new Set()), 300)
      playMoveSound()

      const has128Plus = gridWithTile.flat().some((v) => v >= 128)
      if (has128Plus && !reached128) {
        setReached128(true)
        playRecordSound()
        speakCongratulations()
      }
      if (!has128Plus && reached128) {
        setReached128(false)
      }

      if (newScore > maxScore) {
        setMaxScore(newScore)
        localStorage.setItem('merge_number_max_score', newScore.toString())
      }

      if (isGameOver(gridWithTile)) {
        setGameOver(true)
      }
    }
  }, [grid, gameOver, score, maxScore])

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
    setMergeCandidates(new Set())
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const threshold = 30
    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      setMergeCandidates(new Set())
      return
    }

    let direction: 'left' | 'right' | 'up' | 'down'
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    setMergeCandidates(getMergeCandidates(grid, direction))
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const threshold = 30
    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      setMergeCandidates(new Set())
      setTouchStart(null)
      return
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) handleMove('right')
      else handleMove('left')
    } else {
      if (deltaY > 0) handleMove('down')
      else handleMove('up')
    }

    setMergeCandidates(new Set())
    setTouchStart(null)
  }

  useEffect(() => {
    const gameDiv = document.querySelector('.game') as HTMLElement
    if (gameDiv) gameDiv.focus()

    const storedMax = localStorage.getItem('merge_number_max_score')
    if (storedMax) {
      const parsed = parseInt(storedMax, 10)
      if (!Number.isNaN(parsed)) setMaxScore(parsed)
    }
  }, [])

  useEffect(() => {
    if (gameOver) {
      playGameOverSound()
    }
  }, [gameOver])

  return (
    <div className={`game theme-${theme}`} onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} tabIndex={0}>
      <h1>Block Slide Merge</h1>
      <div className="theme-switcher">
        <span>Theme:</span>
        <button className={theme === 'classic' ? 'active' : ''} onClick={() => setTheme('classic')}>Classic</button>
        <button className={theme === 'block' ? 'active' : ''} onClick={() => setTheme('block')}>Block</button>
        <button className={theme === 'neon' ? 'active' : ''} onClick={() => setTheme('neon')}>Neon</button>
        <button className={theme === 'forest' ? 'active' : ''} onClick={() => setTheme('forest')}>Forest</button>
        <button className={theme === 'cyber' ? 'active' : ''} onClick={() => setTheme('cyber')}>Cyber</button>
      </div>
      <div className="score">Score: {score}</div>
      <div className="max-score">Best Score: {maxScore}</div>
      {gameOver && <div className="game-over">Game Over!</div>}
      <div className="grid">
        {grid.map((row, i) => (
          <div key={i} className="row">
            {row.map((cell, j) => {
              const cellKey = `${i}-${j}`
              const highlightClass = mergeCandidates.has(cellKey) ? 'merge-available' : ''
              const animateClass = animatedCells.has(cellKey) ? 'cell-animate' : ''
              return (
                <div key={j} className={`cell cell-${cell} ${highlightClass} ${animateClass}`}>
                  {cell !== 0 ? cell : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="buttons">
        <button className="restart-btn" onClick={resetGame}>Restart</button>
        <button className="fill-btn" onClick={fillRandomly} disabled={gameOver}>Fill Randomly</button>
      </div>
      <div className="instructions">
        Use arrow keys or swipe on mobile to move. Merge numbers up to 1500 with spawn values in multiples of 2.
      </div>
    </div>
  )
}

export default App