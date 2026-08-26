'use client'
export default function Split({ onSplit, canSplit, pressed, showHotkeys = true }) {
    return (
        <button className={`action-btn btn-split${pressed ? ' key-pressed' : ''}`} onClick={onSplit} disabled={!canSplit}>
            Split
            {showHotkeys && <span className="hotkey-hint">A</span>}
        </button>
    )
}
