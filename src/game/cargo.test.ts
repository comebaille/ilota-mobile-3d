import { describe, expect, it } from 'vitest';
import { getCargoPiecePosition } from './cargo';

describe('pile de cargaison', () => {
  it('pose la première ressource au-dessus du dos et la seconde encore plus haut', () => {
    const first = getCargoPiecePosition(0);
    const second = getCargoPiecePosition(1);
    expect(first.y).toBeGreaterThanOrEqual(0.16);
    expect(second.y - first.y).toBeCloseTo(0.18);
  });

  it('compacte 32 ressources sur deux colonnes après la première', () => {
    expect(getCargoPiecePosition(31).y).toBeLessThanOrEqual(3.1);
    expect(getCargoPiecePosition(1).x).toBeLessThan(0);
    expect(getCargoPiecePosition(2).x).toBeGreaterThan(0);
  });
});
