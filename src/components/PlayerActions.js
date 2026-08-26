'use client'
import Hit from './actions/Hit.js'
import Stand from './actions/Stand.js'
import Double from './actions/Double.js'
import Split from './actions/Split.js'
import Resign from './actions/Resign.js'

export default function PlayerActions({ hasSplitPair, canSplit, canDouble, canResign, onDouble, onSplit, onResign, onStand, onValidate, actionFeedback, pressedAction, showHotkeys = true }) {
    return (
        <div className={`action-buttons-wrapper${actionFeedback ? ` feedback-${actionFeedback}` : ''}`}>
            <Hit onValidate={onValidate} pressed={pressedAction === 'hit'} showHotkeys={showHotkeys} />
            <Stand onValidate={onValidate} onStand={onStand} pressed={pressedAction === 'stand'} showHotkeys={showHotkeys} />
            <Double onDouble={onDouble} canDouble={canDouble} pressed={pressedAction === 'double'} showHotkeys={showHotkeys} />
            {hasSplitPair && <Split onSplit={onSplit} canSplit={canSplit} pressed={pressedAction === 'split'} showHotkeys={showHotkeys} />}
            <Resign onResign={onResign} canResign={canResign} pressed={pressedAction === 'resign'} showHotkeys={showHotkeys} />
        </div>
    )
}
