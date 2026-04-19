import { useEffect, useRef } from 'react'
import { useDesignStore } from '../store'

export default function Timeline() {
  const {
    animFrames, currentFrameIdx, isPlaying,
    addAnimFrame, duplicateAnimFrame, removeAnimFrame,
    setCurrentFrameIdx, setFrameDuration, setIsPlaying,
    getEffectiveShapes,
  } = useDesignStore()

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Playback loop
  useEffect(() => {
    if (!isPlaying || animFrames.length === 0) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
      return
    }

    const advance = (idx: number) => {
      const frame = animFrames[idx]
      if (!frame) return
      setCurrentFrameIdx(idx)
      playTimerRef.current = setTimeout(() => {
        advance((idx + 1) % animFrames.length)
      }, frame.duration)
    }

    const startIdx = currentFrameIdx < 0 ? 0 : currentFrameIdx
    advance(startIdx)

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, animFrames.length])

  if (animFrames.length === 0 && !isPlaying) {
    return (
      <div className="h-10 bg-[#1e1e1e] border-t border-[#3e3e3e] flex items-center px-3 gap-2 shrink-0">
        <span className="text-xs text-[#666]">Animation</span>
        <button
          onClick={addAnimFrame}
          className="text-xs bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#ccc] px-2 py-0.5 rounded border border-[#3e3e3e]"
          title="Add animation frame"
        >
          + Add Frame
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1e1e1e] border-t border-[#3e3e3e] shrink-0 flex flex-col" style={{ height: 88 }}>
      {/* Controls row */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-[#3e3e3e]">
        <span className="text-xs text-[#888] font-medium">Frames</span>

        {/* Play / Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#3d3d3d] text-[#ccc] hover:text-white"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="1" width="4" height="10" rx="1" />
              <rect x="7" y="1" width="4" height="10" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 1l9 5-9 5V1z" />
            </svg>
          )}
        </button>

        {/* Base layer button */}
        <button
          onClick={() => { setIsPlaying(false); setCurrentFrameIdx(-1) }}
          className={`text-xs px-2 py-0.5 rounded border ${currentFrameIdx === -1 ? 'bg-[#0079FF] border-[#0079FF] text-white' : 'border-[#3e3e3e] text-[#888] hover:text-white hover:bg-[#2d2d2d]'}`}
        >
          Base
        </button>

        <div className="flex-1" />

        <button
          onClick={addAnimFrame}
          className="text-xs bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#ccc] hover:text-white px-2 py-0.5 rounded border border-[#3e3e3e]"
          title="Add frame"
        >
          + Frame
        </button>
      </div>

      {/* Frames row */}
      <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto flex-1">
        {animFrames.map((frame, idx) => (
          <div
            key={frame.id}
            className={`flex flex-col items-center gap-0.5 shrink-0 cursor-pointer rounded px-1 py-0.5 group ${
              currentFrameIdx === idx ? 'bg-[#0079FF]' : 'bg-[#2d2d2d] hover:bg-[#3d3d3d]'
            }`}
            style={{ minWidth: 64 }}
            onClick={() => { setIsPlaying(false); setCurrentFrameIdx(idx) }}
          >
            <span className={`text-xs font-medium truncate max-w-full ${currentFrameIdx === idx ? 'text-white' : 'text-[#ccc]'}`}>
              {frame.label}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={frame.duration}
                min={10}
                step={50}
                onClick={e => e.stopPropagation()}
                onChange={e => setFrameDuration(idx, Number(e.target.value))}
                className="w-12 text-center text-[10px] bg-[#1e1e1e] border border-[#3e3e3e] rounded text-[#ccc] outline-none focus:border-[#0079FF]"
                title="Duration in ms"
              />
              <span className={`text-[10px] ${currentFrameIdx === idx ? 'text-[#cce0ff]' : 'text-[#666]'}`}>ms</span>
            </div>
            {/* action buttons shown on hover */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); duplicateAnimFrame(idx) }}
                className="text-[10px] text-[#aaa] hover:text-white px-1 rounded hover:bg-[#555]"
                title="Duplicate frame"
              >⧉</button>
              <button
                onClick={e => { e.stopPropagation(); removeAnimFrame(idx) }}
                className="text-[10px] text-[#f88] hover:text-white px-1 rounded hover:bg-[#722]"
                title="Delete frame"
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
