import type { RGBA } from "./types";

export const blank: RGBA = [0, 0, 0, 0];

export const black: RGBA = [0, 0, 0, 1];
export const darkGray: RGBA = [0.25, 0.25, 0.25, 1];
export const gray: RGBA = [0.5, 0.5, 0.5, 1];
export const lightGray: RGBA = [0.75, 0.75, 0.75, 1];
export const white: RGBA = [1, 1, 1, 1];

export const dark: RGBA = [0.1,0.1,0.1,1];
export const light: RGBA = [0.9,0.9,0.9,1];

export const red: RGBA = [0xFF / 255, 0x5F / 255, 0x57 / 255, 1];
export const orange: RGBA = [0xFE / 255, 0xBC / 255, 0x2E / 255, 1];
export const yellow: RGBA = [250 / 255, 200 / 255, 0, 1];
export const green: RGBA = [0x28 / 255, 0xC8 / 255, 0x40 / 255, 1];

export const glassAlbedo: RGBA = [0.92,0.93,0.925,1];
export const glassEmission: RGBA = [0,0.01,0.02,0];

export function mix (a: RGBA, b: RGBA, ratio: number) {
	return [
		a[0] * (1.0 - ratio) + b[0] * ratio,
		a[1] * (1.0 - ratio) + b[1] * ratio,
		a[2] * (1.0 - ratio) + b[2] * ratio,
		a[3] * (1.0 - ratio) + b[3] * ratio,
	] as RGBA;
}
