'use client'
export default function Double({ onDouble, canDouble, pressed, showHotkeys = true }) {
    return (
        <button
            className={`action-btn btn-double${pressed ? ' key-pressed' : ''}`}
            onClick={onDouble}
            disabled={!canDouble}
        >
            Double
            {showHotkeys && <span className="hotkey-hint">D</span>}
        </button>
    )
}
