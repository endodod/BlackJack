'use client'
import { useEffect, useState } from 'react';
import { HARD, SOFT, PAIRS } from '../theory/basicStrategy';
import './StrategyTableModal.css';

const DEALER_COLS = ['2','3','4','5','6','7','8','9','10','A'];

const TABS = [
  ['hard', 'Hard Totals'],
  ['soft', 'Soft Hands'],
  ['pairs', 'Pairs'],
];

function cellClass(code) {
  if (code === 'H')  return 'sc-h';
  if (code === 'S')  return 'sc-s';
  if (code === 'D')  return 'sc-d';
  if (code === 'DS') return 'sc-ds';
  if (code === 'P')  return 'sc-p';
  if (code === 'Rh') return 'sc-rh';
  return '';
}

function StrategyTable({ id, activeTable, title, rows, rowLabel }) {
  return (
    <div className={`st-block${id === activeTable ? ' st-block-active' : ''}`}>
      <div className="st-title">{title}</div>
      <table className="st-table">
        <thead>
          <tr>
            <th className="st-corner"></th>
            {DEALER_COLS.map(c => <th key={c} className="st-head">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {Object.entries(rows).map(([key, actions]) => (
            <tr key={key}>
              <td className="st-row-label">{rowLabel(key)}</td>
              {actions.map((code, i) => (
                <td key={i} className={`st-cell ${cellClass(code)}`}>{code}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StrategyTableModal({ onClose }) {
  const [activeTable, setActiveTable] = useState('hard');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="st-overlay" onClick={onClose}>
      <div className="st-modal" onClick={e => e.stopPropagation()}>
        <div className="st-modal-header">
          <span className="st-modal-title">Basic Strategy — Multi-deck S17</span>
          <button className="st-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="st-legend">
          <span className="st-leg sc-h">H Hit</span>
          <span className="st-leg sc-s">S Stand</span>
          <span className="st-leg sc-d">D Double</span>
          <span className="st-leg sc-ds">DS Dbl/Std</span>
          <span className="st-leg sc-p">P Split</span>
          <span className="st-leg sc-rh">Rh Resign/Hit</span>
        </div>
        {/* Mobile-only: toggle between the 3 tables instead of stacking them */}
        <div className="st-tabs">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={`st-tab-btn${activeTable === id ? ' st-tab-btn-active' : ''}`}
              onClick={() => setActiveTable(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="st-tables">
          <StrategyTable
            id="hard"
            activeTable={activeTable}
            title="Hard Totals"
            rows={HARD}
            rowLabel={k => k}
          />
          <StrategyTable
            id="soft"
            activeTable={activeTable}
            title="Soft Hands"
            rows={SOFT}
            rowLabel={k => `A+${k}`}
          />
          <StrategyTable
            id="pairs"
            activeTable={activeTable}
            title="Pairs"
            rows={PAIRS}
            rowLabel={k => `${k}+${k}`}
          />
        </div>
      </div>
    </div>
  );
}
