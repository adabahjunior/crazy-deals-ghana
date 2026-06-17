import { useEffect, useState } from 'react'

const SEGMENTS = [
  { label: '5 Points', color: '#f59e0b' },
  { label: '10 Points', color: '#22c55e' },
  { label: '1GB Data', color: '#3b82f6' },
]

interface SpinWheelProps {
  canSpin: boolean
  spinning: boolean
  targetSegment?: number | null
  onSpin: () => void
}

export default function SpinWheel({ canSpin, spinning, targetSegment, onSpin }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (spinning && targetSegment != null) {
      const segmentAngle = 360 / SEGMENTS.length
      const extraSpins = 5 * 360
      const targetAngle = extraSpins + (SEGMENTS.length - targetSegment - 0.5) * segmentAngle
      setRotation(targetAngle)
    }
  }, [spinning, targetSegment])

  return (
    <div className="spin-wheel-wrap">
      <div className="spin-wheel-pointer" aria-hidden="true" />
      <div
        className={`spin-wheel ${spinning ? 'spinning' : ''}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          background: `conic-gradient(
            ${SEGMENTS[0].color} 0deg 120deg,
            ${SEGMENTS[1].color} 120deg 240deg,
            ${SEGMENTS[2].color} 240deg 360deg
          )`,
        }}
      >
        {SEGMENTS.map((segment, index) => (
          <div
            key={segment.label}
            className="spin-wheel-label"
            style={{ transform: `rotate(${index * 120 + 60}deg)` }}
          >
            <span>{segment.label}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary spin-wheel-btn"
        onClick={onSpin}
        disabled={!canSpin || spinning}
      >
        {spinning ? 'Spinning...' : canSpin ? 'Spin the Wheel' : 'Spin Locked'}
      </button>
    </div>
  )
}
