import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import { TETROMINOS } from './gameLogic';
import type { TetrominoType } from './gameLogic';
import { useTetris } from './useTetris';
import { sounds } from './audio';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(SERVER_URL);

function Board({ grid, score, level, nextPieceType, holdPiece, gameOver, label, onMove, onRotate, onHardDrop, onHold, isRemote = false, activePiece, ghostPos }: any) {
  const nextPiece = TETROMINOS[nextPieceType as TetrominoType];
  const hPiece = holdPiece ? TETROMINOS[holdPiece as TetrominoType] : null;
  
  const finalDisplayGrid = grid.map((row: any[]) => [...row]);
  if (!isRemote && activePiece && ghostPos) {
    activePiece.shape.forEach((row: number[], y: number) => {
      row.forEach((val, x) => {
        if (val !== 0) {
          const gy = y + ghostPos.y;
          const gx = x + ghostPos.x;
          if (gy >= 0 && gy < grid.length && gx >= 0 && gx < grid[0].length && finalDisplayGrid[gy][gx] === 0) {
            finalDisplayGrid[gy][gx] = 'ghost';
          }
        }
      });
    });
  }

  return (
    <div className="player-board-container">
      <h2 className="player-label">{label} {isRemote ? "(OPPONENT)" : ""}</h2>
      <div className="game-layout">
        <div className="sidebar left-sidebar">
          <div className="info-box"><h3>Hold</h3>
            <div className="hold-preview">
              {hPiece && hPiece.shape.map((row, y) => (
                <div key={`h-${y}`} className="p-row">
                  {row.map((cell, x) => (
                    <div key={`h-${y}-${x}`} className="p-cell" style={{ backgroundColor: cell !== 0 ? hPiece.color : 'transparent', boxShadow: cell !== 0 ? `0 0 5px ${hPiece.color}` : 'none' }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="board">
          {finalDisplayGrid.map((row: any[], y: number) => row.map((cell, x) => (
            <div key={`${y}-${x}`} 
                 className={`cell ${cell !== 0 ? 'filled' : ''} ${cell === 'ghost' ? 'ghost' : ''} ${cell === 'garbage' ? 'garbage' : ''}`}
                 style={{ 
                   backgroundColor: (cell !== 0 && cell !== 'ghost' && cell !== 'garbage') ? TETROMINOS[cell as TetrominoType].color : undefined,
                   boxShadow: (cell !== 0 && cell !== 'ghost' && cell !== 'garbage') ? `0 0 10px ${TETROMINOS[cell as TetrominoType].color}` : undefined,
                   borderColor: cell === 'ghost' ? (activePiece ? TETROMINOS[activePiece.type as TetrominoType].color : '#555') : undefined
                 }} />
          )))}
          {gameOver && <div className="board-overlay">GAME OVER</div>}
        </div>
        <div className="sidebar">
          <div className="info-box"><h3>Score</h3><p>{score}</p></div>
          <div className="info-box"><h3>Level</h3><p>{level}</p></div>
          <div className="info-box"><h3>Next</h3>
            {nextPiece && <div className="next-preview">
              {nextPiece.shape.map((row: number[], y: number) => (
                <div key={`n-r-${y}`} className="p-row">
                  {row.map((cell, x) => (
                    <div key={`n-${y}-${x}`} className="p-cell" style={{ backgroundColor: cell !== 0 ? nextPiece.color : 'transparent', boxShadow: cell !== 0 ? `0 0 5px ${nextPiece.color}` : 'none' }} />
                  ))}
                </div>
              ))}
            </div>}
          </div>
        </div>
      </div>
      {!isRemote && (
        <div className="touch-controls">
          <div className="c-row">
            <button className="t-btn" onPointerDown={(e) => { e.preventDefault(); onHold(); }}>HOLD</button>
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
  const [mode, setMode] = useState<'MENU' | 'SOLO' | 'LOCAL' | 'LOBBY' | 'ONLINE' | 'LEADERBOARD'>('MENU');
  const [room, setRoom] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [pNum, setPNum] = useState<number | null>(null);
  const [oppState, setOppState] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const settings = { startLevel: 1, initialSpeed: 1000, speedScaling: 100 };

  const handleSound = useCallback((type: string, data?: any) => {
    if (type === 'move') sounds.move();
    if (type === 'rotate') sounds.rotate();
    if (type === 'land') sounds.land();
    if (type === 'clear') sounds.clear(data);
    if (type === 'attack') sounds.attack();
    if (type === 'gameOver') sounds.gameOver();
  }, []);

  const onSync = useCallback((state: any) => { 
    if (mode === 'ONLINE') socket.emit('game-state-sync', { roomCode: room, state }); 
  }, [mode, room]);

  const onAttackP1 = useCallback((lines: number) => {
    if (mode === 'LOCAL') p2.receiveGarbage(lines);
    else if (mode === 'ONLINE') socket.emit('send-attack', { roomCode: room, lines });
  }, [mode, room]);

  const onAttackP2 = useCallback((lines: number) => {
    if (mode === 'LOCAL') p1.receiveGarbage(lines);
  }, [mode]);

  const p1 = useTetris(settings, isStarted, mode === 'ONLINE' ? onSync : undefined, onAttackP1, handleSound);
  const p2 = useTetris(settings, isStarted, undefined, onAttackP2, mode === 'LOCAL' ? handleSound : undefined);

  const startSolo = () => { setMode('SOLO'); setIsStarted(true); p1.resetGame(); setScoreSubmitted(false); };
  const startLocal = () => { setMode('LOCAL'); setIsStarted(true); p1.resetGame(); p2.resetGame(); setScoreSubmitted(false); };
  const handleJoin = () => { if (room) socket.emit('join-room', room); };

  const submitScore = () => {
    if (playerName.trim()) {
      socket.emit('submit-score', { name: playerName, score: p1.score });
      setScoreSubmitted(true);
    }
  };

  useEffect(() => {
    socket.on('update-leaderboard', (data) => setLeaderboard(data));
    socket.on('room-joined', ({ playerNumber }) => { setPNum(playerNumber); setMode('ONLINE'); setScoreSubmitted(false); });
    socket.on('player-ready', () => { p1.resetGame(); setIsStarted(true); });
    socket.on('opponent-state-sync', s => setOppState(s));
    socket.on('receive-attack', ({ lines }) => p1.receiveGarbage(lines));
    socket.on('opponent-disconnected', () => { alert('Opponent left'); setIsStarted(false); setMode('MENU'); });
    socket.on('error', (msg) => alert(msg));
    return () => { socket.off('update-leaderboard'); socket.off('room-joined'); socket.off('player-ready'); socket.off('opponent-state-sync'); socket.off('receive-attack'); socket.off('opponent-disconnected'); socket.off('error'); };
  }, [p1]);

  useEffect(() => {
    const hk = (e: KeyboardEvent) => {
      if (!isStarted) return;
      if (mode === 'SOLO' || mode === 'LOCAL' || mode === 'ONLINE') {
        const k = e.key.toLowerCase();
        if (k === 'a') p1.move({x:-1, y:0}); if (k === 'd') p1.move({x:1, y:0});
        if (k === 's') p1.move({x:0, y:1}); if (k === 'w') p1.rotate(); 
        if (k === ' ') p1.hardDrop(); if (k === 'c') p1.hold();
      }
      if (mode === 'LOCAL') {
        if (e.key === 'ArrowLeft') p2.move({x:-1, y:0}); if (e.key === 'ArrowRight') p2.move({x:1, y:0});
        if (e.key === 'ArrowDown') p2.move({x:0, y:1}); if (e.key === 'ArrowUp') p2.rotate(); 
        if (e.key === 'Enter') p2.hardDrop(); if (e.key.toLowerCase() === 'shift') p2.hold();
      }
    };
    window.addEventListener('keydown', hk); return () => window.removeEventListener('keydown', hk);
  }, [isStarted, mode, p1, p2]);

  if (mode === 'MENU') return (
    <div className="s-panel">
      <h1>Neon Tetris Duo</h1>
      <button className="s-btn solo-btn" onClick={startSolo}>SOLO PLAY</button>
      <button className="s-btn" onClick={startLocal}>LOCAL DUEL</button>
      <button className="s-btn" onClick={() => setMode('LOBBY')}>ONLINE DUEL</button>
      <button className="s-btn" style={{background: '#222', color: '#888'}} onClick={() => setMode('LEADERBOARD')}>RECORDS</button>
    </div>
  );

  if (mode === 'LEADERBOARD') return (
    <div className="s-panel">
      <h1>Top Records</h1>
      <div className="records-list">
        {leaderboard.map((entry, i) => (
          <div key={i} className="record-item">
            <span className="rank">{i + 1}</span>
            <span className="name">{entry.name}</span>
            <span className="score">{entry.score}</span>
          </div>
        ))}
        {leaderboard.length === 0 && <p>No records yet!</p>}
      </div>
      <button className="s-btn" onClick={() => setMode('MENU')}>BACK</button>
    </div>
  );

  if (mode === 'LOBBY') return (
    <div className="s-panel">
      <h1>Online Lobby</h1>
      <input type="text" placeholder="Room Code" value={room} onChange={e => setRoom(e.target.value)} />
      <button className="s-btn" onClick={handleJoin}>JOIN ROOM</button>
      <button className="s-btn" style={{background: '#333', marginTop: '10px'}} onClick={() => setMode('MENU')}>BACK</button>
    </div>
  );

  return (
    <div className="m-container">
      {mode === 'SOLO' && (
        <Board {...p1} label="SOLO" onMove={p1.move} onRotate={p1.rotate} onHardDrop={p1.hardDrop} onHold={p1.hold} />
      )}
      {mode === 'LOCAL' && (
        <>
          <Board {...p1} label="PLAYER 1" onMove={p1.move} onRotate={p1.rotate} onHardDrop={p1.hardDrop} onHold={p1.hold} />
          <div className="div"></div>
          <Board {...p2} label="PLAYER 2" onMove={p2.move} onRotate={p2.rotate} onHardDrop={p2.hardDrop} onHold={p2.hold} />
        </>
      )}
      {mode === 'ONLINE' && (
        <>
          {!isStarted ? (
            <div className="s-panel">
              <h1>Room: {room}</h1>
              <p>Waiting for opponent...</p>
              <button className="s-btn" style={{background: '#333'}} onClick={() => {setMode('MENU'); setIsStarted(false)}}>CANCEL</button>
            </div>
          ) : (
            <>
              <Board {...p1} label={`PLAYER ${pNum}`} onMove={p1.move} onRotate={p1.rotate} onHardDrop={p1.hardDrop} onHold={p1.hold} />
              <div className="div"></div>
              {oppState ? <Board {...oppState} label="OPPONENT" isRemote /> : <div className="info-box">Syncing opponent...</div>}
            </>
          )}
        </>
      )}
      {(p1.gameOver || (mode==='LOCAL' && p2.gameOver) || (mode==='ONLINE' && oppState?.gameOver)) && (
        <div className="g-over">
          <h2>GAME OVER</h2>
          {!scoreSubmitted ? (
            <div className="submit-score">
              <p>Score: {p1.score}</p>
              <input type="text" placeholder="Your Name" maxLength={10} value={playerName} onChange={e => setPlayerName(e.target.value)} />
              <button className="s-btn" onClick={submitScore}>SUBMIT SCORE</button>
            </div>
          ) : (
            <p>Score saved!</p>
          )}
          <button className="s-btn" style={{marginTop: '20px', background: '#333'}} onClick={()=>{setIsStarted(false); setMode('MENU'); setOppState(null);}}>BACK TO MENU</button>
        </div>
      )}
    </div>
  );
}
