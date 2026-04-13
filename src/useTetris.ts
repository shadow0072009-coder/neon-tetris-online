import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLS, ROWS, TETROMINOS, randomTetromino, createEmptyGrid, rotate, checkCollision } from './gameLogic';
import type { TetrominoType } from './gameLogic';
import { useInterval } from './useInterval';

interface Settings { startLevel: number; initialSpeed: number; speedScaling: number; }

export function useTetris(settings: Settings, isStarted: boolean, onStateSync?: (state: any) => void) {
  const [grid, setGrid] = useState<(number | string)[][]>(createEmptyGrid());
  const [activePiece, setActivePiece] = useState<{ type: TetrominoType; pos: { x: number; y: number }; shape: number[][] } | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>(randomTetromino());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(settings.startLevel);
  const [gameOver, setGameOver] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);

  const displayGrid = useMemo(() => {
    const renderGrid = grid.map(row => [...row]);
    if (activePiece) {
      activePiece.shape.forEach((row, y) => row.forEach((val, x) => {
        if (val !== 0) {
          const gy = y + activePiece.pos.y;
          const gx = x + activePiece.pos.x;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) renderGrid[gy][gx] = activePiece.type;
        }
      }));
    }
    return renderGrid;
  }, [grid, activePiece]);

  useEffect(() => {
    if (onStateSync && isStarted) onStateSync({ grid: displayGrid, score, level, gameOver, nextPieceType });
  }, [displayGrid, score, level, gameOver, nextPieceType, onStateSync, isStarted]);

  const resetGame = useCallback(() => {
    setGrid(createEmptyGrid()); setGameOver(false); setScore(0); setLevel(settings.startLevel);
    const type = randomTetromino();
    setActivePiece({ type, pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, shape: TETROMINOS[type].shape });
    setNextPieceType(randomTetromino());
    setDropTime(Math.max(100, settings.initialSpeed - (settings.startLevel - 1) * settings.speedScaling));
  }, [settings]);

  const landPiece = useCallback((piece = activePiece, g = grid) => {
    if (!piece) return;
    const newGrid = g.map(row => [...row]);
    piece.shape.forEach((row, y) => row.forEach((val, x) => {
      if (val !== 0) {
        const gy = y + piece.pos.y;
        const gx = x + piece.pos.x;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) newGrid[gy][gx] = piece.type;
      }
    }));
    let cleared = 0;
    const finalGrid = newGrid.reduce((acc, row) => {
      if (row.every(c => c !== 0)) { cleared++; acc.unshift(Array(COLS).fill(0)); }
      else acc.push(row);
      return acc;
    }, [] as (number | string)[][]);
    if (cleared > 0) {
      const ns = score + cleared * 100 * level; setScore(ns);
      if (ns >= level * 1000) {
        setLevel(l => l + 1); setDropTime(Math.max(100, settings.initialSpeed - level * settings.speedScaling));
      }
    }
    setGrid(finalGrid);
    const nType = nextPieceType;
    if (checkCollision(TETROMINOS[nType].shape, { x: Math.floor(COLS / 2) - 1, y: 0 }, finalGrid)) {
      setGameOver(true); setDropTime(null);
    } else {
      setActivePiece({ type: nType, pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, shape: TETROMINOS[nType].shape });
      setNextPieceType(randomTetromino());
    }
  }, [activePiece, grid, nextPieceType, level, score, settings]);

  const move = useCallback((dir: { x: number; y: number }) => {
    if (!activePiece || gameOver || !isStarted) return;
    if (!checkCollision(activePiece.shape, { x: activePiece.pos.x + dir.x, y: activePiece.pos.y + dir.y }, grid)) {
      setActivePiece(prev => prev ? ({ ...prev, pos: { x: prev.pos.x + dir.x, y: prev.pos.y + dir.y } }) : null);
    } else if (dir.y > 0) landPiece();
  }, [activePiece, grid, gameOver, isStarted, landPiece]);

  const rotatePiece = useCallback(() => {
    if (!activePiece || gameOver || !isStarted) return;
    const rs = rotate(activePiece.shape);
    if (!checkCollision(rs, activePiece.pos, grid)) setActivePiece(prev => prev ? ({ ...prev, shape: rs }) : null);
  }, [activePiece, grid, gameOver, isStarted]);

  const hardDrop = useCallback(() => {
    if (!activePiece || gameOver || !isStarted) return;
    let cy = activePiece.pos.y;
    while (!checkCollision(activePiece.shape, { x: activePiece.pos.x, y: cy + 1 }, grid)) cy++;
    landPiece({ ...activePiece, pos: { ...activePiece.pos, y: cy } });
  }, [activePiece, grid, gameOver, isStarted, landPiece]);

  const ghostPos = useMemo(() => {
    if (!activePiece) return null;
    let gy = activePiece.pos.y;
    while (!checkCollision(activePiece.shape, { x: activePiece.pos.x, y: gy + 1 }, grid)) gy++;
    return { ...activePiece.pos, y: gy };
  }, [activePiece, grid]);

  return { grid: displayGrid, activePiece, nextPieceType, score, level, gameOver, resetGame, move, rotate: rotatePiece, hardDrop, ghostPos };
}
