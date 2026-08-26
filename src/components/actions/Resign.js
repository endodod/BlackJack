'use client'
export default function Resign({ onResign, canResign, pressed, showHotkeys = true }) {
    return (
        <button className={`action-btn btn-resign${pressed ? ' key-pressed' : ''}`} onClick={onResign} disabled={!canResign}>
            Resign
            {showHotkeys && <span className="hotkey-hint">R</span>}
        </button>
    )
}
