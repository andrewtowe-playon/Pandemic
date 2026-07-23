/* =============================================================================
 * playerPanel.js  —  ALL PLAYERS OVERVIEW PANEL  (owner: Andrew)
 * -----------------------------------------------------------------------------
 * Read-only panel showing every player's current city and hand cards.
 * Renders into #all-players-panel in the sidebar.
 *
 * Hooks into Render.render() (wraps it) so it stays in sync automatically
 * without touching any other team member's file.
 * ===========================================================================*/

const PlayerPanel = {

  render() {
    const box = document.getElementById('all-players-panel');
    if (!box || !GameState.players.length) return;

    box.innerHTML = '';

    GameState.players.forEach((player, idx) => {
      const isActive = idx === GameState.currentPlayerIndex;
      const role = ROLES[player.role] || { color: '#cce', blurb: '' };

      const row = document.createElement('div');
      row.style.cssText =
        `padding: 6px 8px; margin-bottom: 5px; border-radius: 5px; border-left: 3px solid ${role.color};` +
        `background: ${isActive ? 'rgba(255,255,255,0.05)' : 'transparent'};`;

      // Name + location
      const header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px;';
      const roleLabel = window.THEME ? THEME.roleLabel(player.role) : player.role;
      header.innerHTML =
        `<span style="font-size:0.8rem;font-weight:bold;color:${role.color}">${roleLabel}</span>` +
        `<span style="font-size:0.7rem;color:#889">📍 ${player.location}</span>`;

      // Hand chips
      const handEl = document.createElement('div');
      handEl.style.cssText = 'display:flex; flex-wrap:wrap; gap:2px;';

      if (player.hand.length === 0) {
        handEl.innerHTML = '<span style="font-size:0.68rem;color:#556;">(no cards)</span>';
      } else {
        player.hand.forEach(card => {
          const chip = document.createElement('span');
          chip.style.cssText =
            'display:inline-block; padding:2px 6px; border-radius:3px; font-size:0.67rem;' +
            'border:1px solid rgba(255,255,255,0.15);';
          if (card.type === 'city') {
            chip.style.background = COLOR_HEX[card.color];
            chip.style.color = '#000';
            chip.textContent = card.city;
          } else if (card.type === 'event') {
            chip.style.background = '#2a2050';
            chip.style.color = '#e8d9ff';
            chip.textContent = `★ ${window.THEME ? THEME.eventLabel(card.name) : card.name}`;
          } else {
            chip.style.background = '#333';
            chip.style.color = '#fa0';
            chip.textContent = '⚡ Epidemic';
          }
          handEl.appendChild(chip);
        });

        if (player.hand.length > HAND_LIMIT) {
          const warn = document.createElement('span');
          warn.style.cssText = 'font-size:0.67rem;color:#f88;';
          warn.textContent = ` ⚠ ${player.hand.length}/${HAND_LIMIT}`;
          handEl.appendChild(warn);
        }
      }

      row.append(header, handEl);
      box.appendChild(row);
    });
  },
};

// ── Hook into Render.render so this panel updates automatically ───────────────
// Wrap after the page loads so Render is guaranteed to be defined.
document.addEventListener('DOMContentLoaded', () => {
  if (window.Render && Render.render) {
    const _orig = Render.render.bind(Render);
    Render.render = function () {
      _orig();
      PlayerPanel.render();
    };
  }
  // Game.boot() may have already called Render.render() before this listener
  // ran (script load order: game.js registers its DOMContentLoaded listener
  // first). Render directly here to catch that initial render.
  PlayerPanel.render();
});

window.PlayerPanel = PlayerPanel;
