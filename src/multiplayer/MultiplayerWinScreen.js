'use client'

export default function MultiplayerWinScreen({ gameState, playerId, winData, onContinue, onLeave }) {
  const players = gameState?.players ?? [];
  const continueReady = gameState?.continueReady ?? [];
  const gameMode = gameState?.gameMode ?? 'freeplay';
  const roundLimit = gameState?.roundLimit ?? 5;
  const targetBankroll = gameState?.targetBankroll ?? 5000;

  const ranked = [...players].sort((a, b) => b.bankroll - a.bankroll);
  const winnerIds = new Set((winData ?? []).map(w => w.id));
  const readyIds = new Set(continueReady);

  const isMultiWinner = winnerIds.size > 1;
  const headline =
    isMultiWinner ? "It's a Tie!" :
    winData?.[0]  ? `${winData[0].name} Wins!` :
    'Game Over';

  const subtitle =
    gameMode === 'highest-bankroll' ? `Best bankroll after ${roundLimit} rounds` :
    gameMode === 'target-bankroll'  ? `First to reach $${targetBankroll.toLocaleString()}` :
    '';

  const localReady = readyIds.has(playerId);
  const humanPlayers = players.filter(p => !p.isBot);
  const readyCount = humanPlayers.filter(p => readyIds.has(p.id)).length;
  const waitingCount = humanPlayers.length - readyCount;

  return (
    <div className="mp-screen">
      <div className="mp-win-card">

        <div className="mp-win-header">
          <div className="mp-win-trophy">🏆</div>
          <h1 className="mp-win-title">{headline}</h1>
          {subtitle && <p className="mp-win-subtitle">{subtitle}</p>}
        </div>

        <div className="mp-win-rankings">
          <div className="mp-win-rankings-label">Final Standings</div>
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className={`mp-win-rank-row${winnerIds.has(p.id) ? ' mp-win-rank-winner' : ''}`}
            >
              <span className="mp-win-rank-pos">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="mp-win-rank-name">{p.name}</span>
              <span className="mp-win-rank-bankroll">${p.bankroll.toLocaleString()}</span>
              {!p.isBot && (
                <span className={`mp-win-ready-dot${readyIds.has(p.id) ? ' mp-win-ready-dot-on' : ''}`} title={readyIds.has(p.id) ? 'Ready' : 'Not ready'} />
              )}
            </div>
          ))}
        </div>

        <div className="mp-win-actions">
          <button
            className={`mp-primary-btn${localReady ? ' mp-primary-btn-muted' : ''}`}
            onClick={onContinue}
            disabled={localReady}
          >
            {localReady ? (
              waitingCount > 0
                ? `Waiting for ${waitingCount} player${waitingCount > 1 ? 's' : ''}…`
                : 'All ready — returning…'
            ) : 'Continue'}
          </button>
          <button className="mp-back-btn" onClick={onLeave}>
            Leave Lobby
          </button>
        </div>

      </div>
    </div>
  );
}
