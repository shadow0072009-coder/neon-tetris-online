import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import { TETROMINOS } from './gameLogic';
import type { TetrominoType } from './gameLogic';
import { useTetris } from './useTetris';

// Manzilni aniqlash: Internetda VITE_SERVER_URL ishlaydi, localda esa localhost:3001
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(SERVER_URL);

function Board({ grid, score, level, nextPieceType, gameOver, label, onMove, onRotate, onHardDrop, isRemote = false }: any) {
  const nextPiece = TETROMINOS[nextPieceType as TetrominoType];
  return (
    <div className="player-board-container">
      <h2 className="player-label">{label} {isRemote ? "(OPPONENT)" : "(YOU)"}</h2>
      <div className="game-layout">
        <div className="board">
          {grid.map((row: any[], y: number) => row.map((cell, x) => (
            <div key={`${y}-${x}`} className={`cell ${cell !== 0 ? 'filled' : ''}`}
                 style={{ backgroundColor: cell !== 0 ? TETROMINOS[cell as TetrominoType].color : undefined,
                          boxShadow: cell !== 0 ? `0 0 10px ${TETROMINOS[cell as TetrominoType].color}` : undefined }} />
          )))}
          {gameOver && <div className="board-overlay">GAME OVER</div>}
        </div>
        <div className="sidebar">
          <div className="info-box"><h3>Score</h3><p>{score}</p></div>
          <div className="info-box"><h3>Next</h3>
            {nextPiece && <div className="next-preview" style={{ gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 25px)` }}>
              {nextPiece.shape.map((row, y) => row.map((cell, x) => (
                <div key={`n-${y}-${x}`} className="p-cell" style={{ backgroundColor: cell !== 0 ? nextPiece.color : 'transparent', boxShadow: cell !== 0 ? `0 0 5px ${nextPiece.color}` : 'none' }} />
              )))}
            </div>}
          </div>
        </div>
      </div>
      
      {/* MOBIL BOSHQARUV TUGMALARI */}
      {!isRemote && (
        <div className="touch-controls">
          <div className="c-row">
            <button className="t-btn rotate-btn" onPointerDown={(e) => { e.preventDefault(); onRotate(); }}>ROTATE</button>
          </div>
          <div className="c-row">
            <button className="t-btn" onPointerDown={(e) => { e.preventDefault(); onMove({x:-1, y:0}); }}>LEFT</button>
            <button className="t-btn" onPointerDown={(e) => { e.preventDefault(); onMove({x:0, y:1}); }}>DOWN</button>
            <button className="t-btn" onPointerDown={(e) => { e.preventDefault(); onMove({x:1, y:0}); }}>RIGHT</button>
          </div>
          <div className="c-row">
            <button className="t-btn h-drop" onPointerDown={(e) => { e.preventDefault(); onHardDrop(); }}>HARD DROP</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<'MENU' | 'LOCAL' | 'LOBBY' | 'ONLINE'>('MENU');
  const [room, setRoom] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [pNum, setPNum] = useState<number | null>(null);
  const [oppState, setOppState] = useState<any>(null);
  const settings = { startLevel: 1, initialSpeed: 1000, speedScaling: 100 };

  const onSync = useCallback((state: any) => { 
    if (mode === 'ONLINE') socket.emit('game-state-sync', { roomCode: room, state }); 
  }, [mode, room]);

  const p1 = useTetris(settings, isStarted, mode === 'ONLINE' ? onSync : undefined);
  const p2 = useTetris(settings, isStarted);

  const startLocal = () => { setMode('LOCAL'); setIsStarted(true); p1.resetGame(); p2.resetGame(); };
  const handleJoin = () => { if (room) { console.log("Joining room:", room); socket.emit('join-room', room); } };

  useEffect(() => {
    socket.on('connect', () => console.log("Connected to server"));
    socket.on('room-joined', ({ playerNumber }) => { 
      console.log("Joined as player:", playerNumber);
      setPNum(playerNumber); 
      setMode('ONLINE'); 
    });
    socket.on('player-ready', () => { 
      console.log("Opponent found! Starting...");
      p1.resetGame(); 
      setIsStarted(true); 
    });
    socket.on('opponent-state-sync', s => setOppState(s));
    socket.on('opponent-disconnected', () => { 
      alert('Opponent left'); 
      setIsStarted(false);
      setMode('MENU'); 
    });
    socket.on('error', (msg) => alert(msg));

    return () => { 
      socket.off('connect');
      socket.off('room-joined'); 
      socket.off('player-ready'); 
      socket.off('opponent-state-sync'); 
      socket.off('opponent-disconnected'); 
      socket.off('error');
    };
  }, [p1]);

  useEffect(() => {
    const hk = (e: KeyboardEvent) => {
      if (!isStarted) return;
      if (mode === 'LOCAL' || mode === 'ONLINE') {
        if (e.key === 'a' || e.key === 'w' || e.key === 's' || e.key === 'd' || e.key === ' ') {
          if (e.key === 'a') p1.move({x:-1, y:0}); 
          if (e.key === 'd') p1.move({x:1, y:0});
          if (e.key === 's') p1.move({x:0, y:1}); 
          if (e.key === 'w') p1.rotate(); 
          if (e.key === ' ') p1.hardDrop();
        }
      }
      if (mode === 'LOCAL') {
        if (e.key.includes('Arrow') || e.key === 'Enter') {
          if (e.key === 'ArrowLeft') p2.move({x:-1, y:0}); 
          if (e.key === 'ArrowRight') p2.move({x:1, y:0});
          if (e.key === 'ArrowDown') p2.move({x:0, y:1}); 
          if (e.key === 'ArrowUp') p2.rotate(); 
          if (e.key === 'Enter') p2.hardDrop();
        }
      }
    };
    window.addEventListener('keydown', hk); 
    return () => window.removeEventListener('keydown', hk);
  }, [isStarted, mode, p1, p2]);

  if (mode === 'MENU') return (
    <div className="s-panel">
      <h1>Neon Tetris Duo</h1>
      <button className="s-btn" onClick={startLocal}>LOCAL DUEL</button>
      <button className="s-btn" onClick={() => setMode('LOBBY')}>ONLINE DUEL</button>
    </div>
  );

  if (mode === 'LOBBY') return (
    <div className="s-panel">
      <h1>Online Lobby</h1>
      <input type="text" placeholder="Room Code (e.g. 123)" value={room} onChange={e => setRoom(e.target.value)} />
      <button className="s-btn" onClick={handleJoin}>JOIN ROOM</button>
      <button className="s-btn" style={{background: '#333', marginTop: '10px'}} onClick={() => setMode('MENU')}>BACK</button>
    </div>
  );

  return (
    <div className="m-container">
      {mode === 'LOCAL' ? (
        <>
          <Board {...p1} label="PLAYER 1" onMove={p1.move} onRotate={p1.rotate} onHardDrop={p1.hardDrop} />
          <div className="div"></div>
          <Board {...p2} label="PLAYER 2" onMove={p2.move} onRotate={p2.rotate} onHardDrop={p2.hardDrop} />
        </>
      ) : (
        <>
          {!isStarted ? (
            <div className="s-panel">
              <h1>Room: {room}</h1>
              <p>Waiting for opponent...</p>
              <button className="s-btn" style={{background: '#333'}} onClick={() => {setMode('MENU'); setIsStarted(false)}}>CANCEL</button>
            </div>
          ) : (
            <>
              <Board {...p1} label={`PLAYER ${pNum}`} onMove={p1.move} onRotate={p1.rotate} onHardDrop={p1.hardDrop} />
              <div className="div"></div>
              {oppState ? <Board {...oppState} label="OPPONENT" isRemote /> : <div className="info-box">Syncing opponent...</div>}
            </>
          )}
        </>
      )}
      {(p1.gameOver || (mode==='LOCAL' && p2.gameOver) || (mode==='ONLINE' && oppState?.gameOver)) && (
        <div className="g-over">
          <h2>GAME OVER</h2>
          <button className="s-btn" onClick={()=>{setIsStarted(false); setMode('MENU'); setOppState(null);}}>BACK TO MENU</button>
        </div>
      )}
    </div>
  );
}
