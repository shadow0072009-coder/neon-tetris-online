import { useState, useEffect, useCallback, useMemo } from 'react';
import { COLS, ROWS, TETROMINOS, randomTetromino, createEmptyGrid, rotate, checkCollision } from './gameLogic';
import type { TetrominoType } from './gameLogic';
import { useInterval } from './useInterval';

interface Settings { startLevel: number; initialSpeed: number; speedScaling: number; }

export function useTetris(settings: Settings, isStarted: boolean, onStateSync?: (state: any) => void, onAttack?: (lines: number) => void) {
  const [grid, setGrid] = useState<(number | string)[][]>(createEmptyGrid());
  const [activePiece, setActivePiece] = useState<{ type: TetrominoType; pos: { x: number; y: number }; shape: number[][] } | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>(randomTetromino());
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
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
    if (onStateSync && isStarted) {
      onStateSync({ grid: displayGrid, score, level, gameOver, nextPieceType, holdPiece });
    }
  }, [displayGrid, score, level, gameOver, nextPieceType, holdPiece, onStateSync, isStarted]);

  const resetGame = useCallback(() => {
    setGrid(createEmptyGrid()); setGameOver(false); setScore(0); setLevel(settings.startLevel);
    setHoldPiece(null); setCanHold(true);
    const type = randomTetromino();
    setActivePiece({ type, pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, shape: TETROMINOS[type].shape });
    setNextPieceType(randomTetromino());
    setDropTime(Math.max(100, settings.initialSpeed - (settings.startLevel - 1) * settings.speedScaling));
  }, [settings]);

  const receiveGarbage = useCallback((lines: number) => {
    setGrid(prev => {
      const newGrid = prev.slice(lines); // Tepadan qatorlarni o'chirish
      for (let i = 0; i < lines; i++) {
        const garbageRow = Array(COLS).fill('garbage');
        const hole = Math.floor(Math.random() * COLS);
        garbageRow[hole] = 0; // Bitta teshik qoldirish
        newGrid.push(garbageRow);
      }
      return newGrid;
    });
  }, []);

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
      if (row.every(c => c !== 0 && c !== 'garbage')) { 
        cleared++; 
        acc.unshift(Array(COLS).fill(0)); 
      }
      else acc.push(row);
      return acc;
    }, [] as (number | string)[][]);

    // Attack logic: 2 lines -> 1 garbage, 3 lines -> 2, 4 lines -> 4
    if (cleared >= 2 && onAttack) {
      const attackLines = cleared === 4 ? 4 : cleared - 1;
      onAttack(attackLines);
    }

    if (cleared > 0) {
      const ns = score + cleared * 100 * level; setScore(ns);
      if (ns >= level * 1000) {
        setLevel(l => l + 1); setDropTime(Math.max(100, settings.initialSpeed - level * settings.speedScaling));
      }
    }

    setGrid(finalGrid);
    setCanHold(true);

    const nType = nextPieceType;
    if (checkCollision(TETROMINOS[nType].shape, { x: Math.floor(COLS / 2) - 1, y: 0 }, finalGrid)) {
      setGameOver(true); setDropTime(null);
    } else {
      setActivePiece({ type: nType, pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, shape: TETROMINOS[nType].shape });
      setNextPieceType(randomTetromino());
    }
  }, [activePiece, grid, nextPieceType, level, score, settings, onAttack]);

  const hold = useCallback(() => {
    if (!activePiece || !canHold || gameOver || !isStarted) return;
    const currentType = activePiece.type;
    if (holdPiece === null) {
      setHoldPiece(currentType);
      const nType = nextPieceType;
      setActivePiece({ type: nType, pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, shape: TETROMINOS[nType].shape });
      setNextPieceType(randomTetromino());
    } else {
      const toHold = currentType;
      const fromHold = holdPiece;
      setHoldPiece(toHold);
      setActivePiece({ type: fromHold, pos: { x: Math.floor(COLS / 2) - 1, y: 0 }, shape: TETROMINOS[fromHold].shape });
    }
    setCanHold(false);
  }, [activePiece, holdPiece, canHold, nextPieceType, gameOver, isStarted]);

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

  useInterval(() => move({ x: 0, y: 1 }), isStarted ? dropTime : null);

  return { grid: displayGrid, activePiece, nextPieceType, holdPiece, score, level, gameOver, resetGame, move, rotate: rotatePiece, hardDrop, hold, receiveGarbage };
}
