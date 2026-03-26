'use client';

interface MemoryCardProps {
  fruit: string;
  isFlipped: boolean;
  isMatched: boolean;
  isHidden: boolean;
  onClick: () => void;
}

export default function MemoryCard({ fruit, isFlipped, isMatched, isHidden, onClick }: MemoryCardProps) {
  return (
    <div 
      className={`memory-card ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''} ${isHidden ? 'hidden' : ''}`}
      onClick={onClick}
    >
      <div className="memory-card-inner">
        <div className="memory-card-front">
          <span>?</span>
        </div>
        <div className="memory-card-back">
          <span className="text-4xl">{fruit}</span>
        </div>
      </div>
    </div>
  );
}
