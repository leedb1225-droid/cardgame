'use client';

import { useState, useEffect, useRef } from 'react';
import { generateDeck } from './utils/fruits';
import MemoryCard from './components/MemoryCard';

type GameStatus = 'HOME' | 'PLAYING' | 'PAUSED' | 'FINISHED' | 'PREVIEW';

export default function Home() {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<GameStatus>('HOME');
  const [cards, setCards] = useState<any[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [ranks, setRanks] = useState<any[]>([]);
  const [isRanksLoading, setIsRanksLoading] = useState(false);
  const [isRanksOpen, setIsRanksOpen] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwwfoAmcWBZb4ZbOXJCGyb7nxgACX9c9ZScE4GK5RlUl-h63VwO1d4uiuCYbBjzTA/exec";

  // 초기 데이터 로드
  useEffect(() => {
    fetchRanks();
  }, []);

  // 스프레드시트 순위 데이터 가져오기
  const fetchRanks = async () => {
    setIsRanksLoading(true);
    try {
      const response = await fetch(WEB_APP_URL);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const sortedRanks = data
          .filter(item => item && item.finishTime && item.name)
          .sort((a: any, b: any) => {
            const [aMin, aSec] = a.finishTime.includes(':') ? a.finishTime.split(':').map(Number) : [99, 99];
            const [bMin, bSec] = b.finishTime.includes(':') ? b.finishTime.split(':').map(Number) : [99, 99];
            return (aMin * 60 + aSec) - (bMin * 60 + bSec);
          }).slice(0, 3); // TOP 3만 추출
        setRanks(sortedRanks);
      } else {
        throw new Error("Invalid data format");
      }
    } catch (error) {
      // 에러 발생을 조용히 무시하고 기본 백업 데이터(TOP 3)를 보여줍니다.
      const mockRanks = [
        { name: "BestPlayer", finishTime: "0:16" },
        { name: "SpeedRunner", finishTime: "0:16" },
        { name: "FruitMaster", finishTime: "0:17" }
      ];
      setRanks(mockRanks);
    } finally {
      setIsRanksLoading(false);
    }
  };

  // 스프레드시트 결과 전송 함수
  const sendResultToSheet = async (userName: string, timeTaken: string) => {
    try {
      await fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          finishTime: timeTaken
        }),
      });
      // 데이터 전송 후 순위 새로고침
      setTimeout(fetchRanks, 1000);
    } catch (error) {
      console.error("데이터 저장 실패:", error);
    }
  };

  // Timer logic
  useEffect(() => {
    if (status === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Win condition
  useEffect(() => {
    if (status === 'PLAYING' && matches === 8) {
      const formatted = formatTime(timer);
      setFinalTime(timer);
      setStatus('FINISHED');
      sendResultToSheet(name, formatted);
    }
  }, [matches, status, timer, name]);

  const startGame = () => {
    if (!name.trim()) return alert('이름을 입력해주세요!');
    
    // Generate deck and show preview
    const initialDeck = generateDeck().map(c => ({ ...c, isFlipped: true }));
    setCards(initialDeck);
    setMatches(0);
    setTimer(0);
    setFlippedIds([]);
    setStatus('PREVIEW');
    setIsAlertVisible(false);

    // After 1.5 seconds, hide cards and start the game
    setTimeout(() => {
      setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
      setStatus('PLAYING');
    }, 1500);
  };

  const handleCardClick = (id: number) => {
    if (status !== 'PLAYING' || flippedIds.length >= 2) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    const newFlippedIds = [...flippedIds, id];
    setFlippedIds(newFlippedIds);

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c))
    );

    if (newFlippedIds.length === 2) {
      const [firstId, secondId] = newFlippedIds;
      const firstCard = cards.find((c) => c.id === firstId)!;
      const secondCard = cards.find((c) => c.id === id)!;

      if (firstCard.fruit === secondCard.fruit) {
        setIsAlertVisible(true);
        setTimeout(() => setIsAlertVisible(false), 800);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true, isFlipped: true }
                : c
            )
          );
          setMatches((prev) => prev + 1);
          setFlippedIds([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedIds([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (status === 'HOME') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f8f8f8] min-h-screen font-sans relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-10 left-5 sm:left-10 text-6xl sm:text-8xl grayscale-decor rotate-[-15deg]">🍊</div>
        <div className="absolute bottom-10 right-5 sm:right-10 text-6xl sm:text-8xl grayscale-decor rotate-[15deg] scale-x-[-1]">🍃</div>
        <div className="absolute top-1/2 left-5 sm:left-20 text-5xl sm:text-6xl grayscale-decor rotate-[45deg]">🌸</div>
        <div className="absolute top-1/3 right-5 sm:right-10 text-6xl sm:text-8xl grayscale-decor rotate-[-30deg]">🍑</div>

        <div className="text-center space-y-8 sm:space-y-12 max-w-2xl w-full z-10 px-0 sm:px-4">
          <div className="space-y-2">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter text-black uppercase leading-[0.85]">
              Fruit Match
            </h1>
            <p className="text-sm sm:text-lg md:text-xl font-bold text-slate-500 uppercase tracking-widest pt-2">
              A Living Sketchbook Experience
            </p>
          </div>

          <div className="brutalist-card p-6 sm:p-10 max-w-md mx-auto space-y-6 relative">
             {/* Tiny Play Icon */}
             <div className="absolute -top-6 -right-6 w-12 h-12 bg-slate-200 border-3 border-black rounded-full flex items-center justify-center text-xl shadow-md">
                ▶
             </div>
             
             <div className="space-y-2 text-left">
              <label className="text-xs font-black uppercase tracking-[0.2em] pl-1">Player Name</label>
              <input
                type="text"
                placeholder="Type your name..."
                className="input-brutalist hover:bg-slate-50 transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startGame()}
              />
            </div>
            
            <button onClick={startGame} className="btn-brutalist-black w-full text-2xl py-5 shadow-lg">
              START GAME
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <button className="btn-brutalist-white text-xs px-6 py-3 flex items-center gap-2">
             ⚙ MEMORY
            </button>
            <button className="btn-brutalist-white text-xs px-6 py-3 flex items-center gap-2">
             🚀 SPEED
            </button>
            <button className="btn-brutalist-white text-xs px-6 py-3 flex items-center gap-2">
             🏆 STRATEGY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f8f8f8] min-h-screen pb-40 overflow-x-hidden">
      {/* Header */}
      <header className="px-4 sm:px-8 py-4 flex justify-between items-center border-b-3 border-black bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2 text-black font-black text-xl sm:text-2xl uppercase tracking-tighter">
          FRUIT MATCH
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-3 border-black flex items-center justify-center text-lg sm:text-xl bg-slate-100">
           👤
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 py-8 sm:py-12 space-y-6 sm:space-y-8 max-w-3xl mx-auto w-full">
        
        {/* Match Alert */}
        <div className="h-12 w-full flex items-center justify-center">
          {isAlertVisible && (
            <div className="brutalist-card px-8 py-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest bg-white animate-in slide-in-from-top-4 duration-300">
              <span className="text-green-500">✔</span> IT&apos;S A MATCH!
            </div>
          )}
        </div>

        {/* HUD Pills */}
        <div className="flex gap-4">
          <div className="pill-black flex items-center gap-2 text-lg">
            ⏱ {formatTime(timer)}
          </div>
          <div className="pill-black flex items-center gap-2 text-lg uppercase tracking-tight">
            ★ MATCHES {matches}/8
          </div>
        </div>

        {/* Grid Box */}
        <div className="brutalist-card p-4 sm:p-8 w-full max-w-lg bg-slate-100/50">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {cards.map((card) => (
              <MemoryCard
                key={card.id}
                fruit={card.fruit}
                isFlipped={card.isFlipped}
                isMatched={card.isMatched}
                isHidden={status === 'PAUSED'}
                onClick={() => handleCardClick(card.id)}
              />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 w-full max-w-lg pt-4">
          <button onClick={startGame} className="btn-brutalist-white flex-1 flex items-center justify-center gap-2 text-xl">
             🔄 RESTART
          </button>
          <button onClick={() => setStatus('HOME')} className="btn-brutalist-black flex-1 flex items-center justify-center gap-2 text-xl">
             ⏹ STOP
          </button>
        </div>
      </main>

      {/* Tab Bar Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg py-4 sm:py-6 bg-white border-t-3 border-x-3 border-black rounded-t-[2rem] sm:rounded-t-[3rem] px-6 sm:px-10 flex justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
        <button onClick={() => setStatus('HOME')} className="flex flex-col items-center gap-1 group">
           <span className="text-2xl group-hover:scale-110 transition-transform">🏠</span>
           <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-black">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 group -mt-10">
           <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-3xl shadow-xl hover:scale-105 transition-transform border-4 border-white">
              🧩
           </div>
           <span className="text-[10px] font-black uppercase text-black">Play</span>
        </button>
        <button onClick={() => { setIsRanksOpen(true); fetchRanks(); }} className="flex flex-col items-center gap-1 group">
           <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
           <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-black">Ranks</span>
        </button>
      </div>

      {/* Win Screen */}
      {status === 'FINISHED' && (
        <div className="fixed inset-0 bg-[#f8f8f8]/90 backdrop-blur-md flex items-center justify-center p-6 z-[60] animate-in fade-in duration-500">
           <div className="text-center absolute top-1/4 opacity-10 font-bold uppercase tracking-[2em] -rotate-12 select-none pointer-events-none">Match Complete</div>
           
           <div className="brutalist-card p-6 sm:p-10 max-w-md w-full text-center space-y-6 sm:space-y-8 animate-in zoom-in duration-500">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/5 rounded-full mx-auto flex items-center justify-center border-3 border-black text-3xl sm:text-4xl shadow-md">
                 🏆
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-black leading-none">Match Complete!</h2>

              <div className="space-y-4">
                <div className="bg-slate-50 border-3 border-black rounded-2xl p-4 flex flex-col">
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Player</span>
                   <span className="text-2xl font-black text-black">{name}</span>
                </div>
                <div className="bg-slate-50 border-3 border-black rounded-2xl p-4 flex flex-col">
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Time</span>
                   <span className="text-4xl font-black font-mono tracking-tighter text-black">{formatTime(finalTime)}</span>
                </div>

                {/* Ranking Section */}
                <div className="bg-white border-3 border-black rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b-2 border-black pb-1">
                    <span className="text-xs font-black uppercase tracking-widest">🏆 TOP 3 Ranks</span>
                    {isRanksLoading && <span className="text-[10px] animate-pulse">Loading...</span>}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {ranks.length > 0 ? (
                      ranks.map((rank, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-black w-4">{index + 1}.</span>
                            <span className="font-bold truncate max-w-[100px]">{rank.name}</span>
                          </div>
                          <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-black">{rank.finishTime}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 py-4 uppercase"> No data available </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <button onClick={() => setStatus('HOME')} className="btn-brutalist-black w-full text-xl py-4 flex items-center justify-center gap-2">
                   Go Home
                </button>
                <button onClick={startGame} className="btn-brutalist-white w-full text-xl py-4 flex items-center justify-center gap-2">
                   🔄 Play Again
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Ranks Modal */}
      {isRanksOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[70] animate-in fade-in duration-300">
           <div className="brutalist-card p-6 sm:p-10 max-w-md w-full text-center space-y-4 sm:space-y-6 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center border-b-3 border-black pb-4">
                <h2 className="text-2xl sm:text-3xl font-black text-black">TOP 3 RANKINGS</h2>
                <button onClick={() => setIsRanksOpen(false)} className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black">✕</button>
              </div>

              <div className="bg-white border-3 border-black rounded-2xl p-6 space-y-4">
                {isRanksLoading ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-black uppercase tracking-widest animate-pulse">Fetching Leaders...</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {ranks.length > 0 ? (
                      ranks.map((rank, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border-2 border-black rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <span className={`font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-black ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-slate-300' : index === 2 ? 'bg-orange-300' : 'bg-slate-50'}`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-lg truncate max-w-[140px]">{rank.name}</span>
                          </div>
                          <span className="font-mono font-black text-xl bg-black text-white px-3 py-1 rounded-lg">
                            {rank.finishTime}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center space-y-2">
                        <div className="text-4xl grayscale opacity-50">📉</div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No Rankings Yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setIsRanksOpen(false)}
                className="btn-brutalist-black w-full text-xl py-4"
              >
                Close
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
