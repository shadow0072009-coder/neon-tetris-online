export const COLS = 10;
export const ROWS = 20;

export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Tetromino {
  shape: number[][];
  color: string;
}

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00f0f0' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#0000f0' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#f0a000' },
  O: { shape: [[1,1],[1,1]], color: '#f0f000' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#00f000' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#a000f0' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#f00000' },
};

export const randomTetromino = (): TetrominoType => {
  const keys = Object.keys(TETROMINOS) as TetrominoType[];
  return keys[Math.floor(Math.random() * keys.length)];
};

export const createEmptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export const rotate = (matrix: number[][]) => {
  return matrix[0].map((_, index) => matrix.map((col) => col[index]).reverse());
};

export const checkCollision = (shape: number[][], pos: { x: number; y: number }, grid: (number | string)[][]) => {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const gridX = x + pos.x;
        const gridY = y + pos.y;
        if (gridX < 0 || gridX >= COLS || gridY >= ROWS || (gridY >= 0 && grid[gridY][gridX] !== 0)) return true;
      }
    }
  }
  return false;
};
