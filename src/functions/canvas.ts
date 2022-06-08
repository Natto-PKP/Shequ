/* eslint-disable @typescript-eslint/no-explicit-any */
import { registerFont } from 'canvas';

// ? Fonts
registerFont('./ressources/fonts/SecularOne-Regular.ttf', { family: 'Secular One' });
export const fontFamilies = 'Secular One, sans-serif';

// ? Functions
export const roundRect = (
  ctx: any,
  x: number,
  y: number,
  width: number,
  height: number,
  rayon?: number,
) => {
  const r = rayon || 0;

  ctx.moveTo(x, y + r);
  ctx.lineTo(x, y + height - r);
  ctx.quadraticCurveTo(x, y + height, x + r, y + height);
  ctx.lineTo(x + width - r, y + height);
  ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - r);
  ctx.lineTo(x + width, y + r);
  ctx.quadraticCurveTo(x + width, y, x + width - r, y);
  ctx.lineTo(x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
};
