export interface CargoPiecePosition {
  x: number;
  y: number;
  z: number;
}

export const getCargoPiecePosition = (index: number): CargoPiecePosition => {
  const safeIndex = Math.max(0, Math.floor(index));
  const stackedIndex = Math.max(0, safeIndex - 1);
  const layer = safeIndex === 0 ? 0 : 1 + Math.floor(stackedIndex / 2);
  const sway = safeIndex === 0 ? 0 : stackedIndex % 2 === 0 ? -1 : 1;
  return {
    x: sway * 0.085,
    y: 0.16 + layer * 0.18,
    z: (layer % 2 === 0 ? -1 : 1) * 0.025,
  };
};
