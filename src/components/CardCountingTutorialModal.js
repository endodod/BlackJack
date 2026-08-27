'use client'
import { useEffect } from 'react';
import './StrategyTableModal.css';
import './CardCountingTutorialModal.css';

export default function CardCountingTutorialModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="st-overlay" onClick={onClose}>
      <div className="st-modal cc-tut-modal" onClick={e => e.stopPropagation()}>
        <div className="st-modal-header">
          <span className="st-modal-title">Card Counting — Hi-Lo</span>
          <button className="st-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="cc-tut-values">
          <div className="cc-tut-value-group cc-tut-value-low">
            <span className="cc-tut-value-cards">2 · 3 · 4 · 5 · 6</span>
            <span className="cc-tut-value-badge">+1</span>
          </div>
          <div className="cc-tut-value-group cc-tut-value-neutral">
            <span className="cc-tut-value-cards">7 · 8 · 9</span>
            <span className="cc-tut-value-badge">0</span>
          </div>
          <div className="cc-tut-value-group cc-tut-value-high">
            <span className="cc-tut-value-cards">10 · J · Q · K · A</span>
            <span className="cc-tut-value-badge">−1</span>
          </div>
        </div>

        <section className="cc-tut-section">
          <h3>Running Count</h3>
          <p>
            As every card is dealt — yours, the dealer&apos;s, everyone&apos;s — add its value above to a running
            total. Low cards (2–6) favor the player when they&apos;re gone from the shoe, so they count
            <strong> +1</strong>. High cards (10–A) favor the player when they&apos;re still in the shoe, so
            they count <strong>−1</strong>. Middle cards (7–9) are <strong>neutral</strong>.
          </p>
        </section>

        <section className="cc-tut-section">
          <h3>True Count</h3>
          <p>
            The running count alone isn&apos;t enough — a count of +6 means a lot more in a half-depleted shoe
            than in a fresh one. Dividing by the decks remaining normalizes for that.
          </p>
          <div className="cc-tut-formula">True Count = Running Count ÷ Decks Remaining</div>
        </section>

        <section className="cc-tut-section">
          <h3>Why it matters</h3>
          <p>
            A higher true count means more high cards are left in the shoe — better odds for the player
            (bigger bets, more blackjacks). A lower or negative count favors the dealer. In this trainer
            you&apos;ll periodically be asked for the current count so you can check your tracking against the
            real numbers as the shoe plays out.
          </p>
        </section>
      </div>
    </div>
  );
}
