// T-ARCH-1 — dependency invariant (R22 / ADR-004). combat is the collision/damage
// SSoT; player uses combat primitives (player→combat one-way). combat must NOT
// import player (breaks the R14 F-ARCH-608f cycle). Static source assertion via
// Vite ?raw — FAIL pre-refactor (combat imports damagePlayer), green after.

import { describe, it, expect } from 'vitest';
import combatSrc from '../src/combat/combat.ts?raw';
import playerSrc from '../src/player/player.ts?raw';

describe('T-ARCH-1 combat ↔ player has no import cycle (ADR-004)', () => {
  it('combat.ts does not import from the player module', () => {
    expect(combatSrc).not.toMatch(/from ['"]\.\.\/player/);
  });

  it('player.ts still depends on combat primitives (one-way edge preserved)', () => {
    expect(playerSrc).toMatch(/from ['"]\.\.\/combat\/combat['"]/);
  });
});
