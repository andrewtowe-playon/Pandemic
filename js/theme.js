/* =============================================================================
 * theme.js  —  DISPLAY-ONLY RESKIN  ("PlayOn: Outage Season")
 * -----------------------------------------------------------------------------
 * A pure presentation layer. Maps the game's canonical identifiers (role IDs,
 * event names, cube colors, cure states) to company-themed labels + flavor.
 *
 * IMPORTANT: this file contains NO game logic. The rules engine still uses the
 * canonical IDs ('Medic', 'Scientist', 'Airlift', ...); only the *displayed*
 * text changes. View code (render/controls/playerPanel/setup) reads from here.
 * Every helper falls back to the raw id/name, so an unmapped value is safe.
 * ===========================================================================*/
const THEME = {
  title:   'PlayOn: Outage Season',
  heading: 'OUTAGE SEASON',
  tagline: 'Ship all four solutions before game-day fires overwhelm the company.',

  /* Canonical role ID -> company role. The ABILITY is unchanged; only flavor
   * differs. Pawn/marker colors still come from ROLES (state.js). */
  roles: {
    'Medic':                 { label: 'On-Call Engineer',     blurb: 'Resolves an entire incident in one action; auto-clears alerts for already-solved domains on arrival.' },
    'Scientist':             { label: 'Senior Engineer',      blurb: 'Ships a solution with only 4 matching tickets instead of 5.' },
    'Researcher':            { label: 'Marketing Lead',       blurb: 'Can hand off ANY ticket to a teammate in the same city — not just the local one.' },
    'Operations Expert':     { label: 'Platform Engineer',    blurb: 'Opens an office for free; once per turn, hops from any office to any city.' },
    'Dispatcher':            { label: 'Engineering Manager',  blurb: "Reassigns people — may move a teammate's pawn as if it were their own." },
    'Quarantine Specialist': { label: 'Security & Compliance',blurb: 'Freezes incidents in their city and every adjacent one.' },
    'Contingency Planner':   { label: 'Finance',              blurb: 'Banks one spent initiative (Event) from the discard to deploy later.' },
  },

  /* Canonical event name -> themed initiative. */
  events: {
    'Airlift':              { label: 'Reorg',           blurb: 'Move any 1 person to any city.' },
    'Government Grant':     { label: 'Budget Approval', blurb: 'Open an office anywhere — no ticket required.' },
    'One Quiet Night':      { label: 'Code Freeze',     blurb: 'Skip the next incident wave.' },
    'Resilient Population': { label: 'Postmortem',      blurb: 'Remove 1 incident from the queue for good.' },
    'Forecast':             { label: 'Roadmap Review',  blurb: 'Peek at and reorder the next 6 incidents.' },
  },

  /* Cube color -> the domain that's on fire. */
  domains: {
    blue:   'Platform',
    yellow: 'Payments',
    black:  'Security',
    red:    'Support',
  },

  /* Cure-marker states -> themed labels (keys are CURE.* values from state.js). */
  cureState: {
    uncured:    'open',
    cured:      '✔ shipped',
    eradicated: '✔✔ automated',
  },

  endgame: {
    winTitle:  'SHIPPED',
    loseTitle: 'GAME OVER',
    winMsg:    'All four solutions launched — the company is thriving!',
    winSub:    'Great teamwork.',
    loseSub:   'Better luck next season.',
  },

  /* ---- helpers (always fall back to the raw value so nothing breaks) ---- */
  roleLabel(id)    { return (this.roles[id]  && this.roles[id].label)  || id || '—'; },
  roleBlurb(id)    { return (this.roles[id]  && this.roles[id].blurb)  || ''; },
  eventLabel(name) { return (this.events[name] && this.events[name].label) || name; },
  eventBlurb(name) { return (this.events[name] && this.events[name].blurb) || ''; },
  domain(color)    { return this.domains[color] || color; },
  cure(state)      { return this.cureState[state] || state; },
};

if (typeof window !== 'undefined') window.THEME = THEME;
if (typeof module !== 'undefined' && module.exports) module.exports = { THEME };
