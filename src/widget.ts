import { black, blank, dark, glassAlbedo, glassEmission, green, mix, orange, red, white } from "./colors";
import glass from "./glass";
import { Pointer } from "./input";
import none from "./none";
import { Shader } from "./shader";
import shadow from "./shadow";
import squircle from "./squircle";
import type { Rect } from "./types";

function mouseOver (rect: Rect): boolean {
	if (Pointer.position[0] < rect[0]) return false;
	if (Pointer.position[0] > rect[0] + rect[2]) return false;
	if (Pointer.position[1] < rect[1]) return false;
	if (Pointer.position[1] > rect[1] + rect[3]) return false;
	return true;
}

export default class Widget {
	public static readonly widgets = new Set<Widget>();
	public static widgetsByIndex = [] as Widget[];

	public static readonly scale = 16;
	
	public rect: Rect = [200, 200, 512, 512];
	private readonly texture = Shader.createTexture();
	
	public draw (): void {
		this.rect[2] = Math.max(this.rect[2], Widget.scale * 22);
		const [x,y,w,h] = this.rect;
		const pad = 32;
		const padded: Rect = [x - pad, y - pad, w + pad * 2, h + pad * 2];
		Shader.clear(this.texture);
		
		// body
		Shader.clear(this.texture);
		none(Shader.fullscreen, Shader.screen, this.texture);
		shadow(padded, pad + Widget.scale * 4, 3, black, this.texture, this.texture);
		squircle([x, y, w, h], Widget.scale * 4, 3, blank, [0.05, 0.05, 0.05, 1], white, blank, this.texture, this.texture);

		const close___ = [x + Widget.scale * 1.5, y + h - 3.5 * Widget.scale, Widget.scale * 2, Widget.scale * 2] as Rect;
		const minimize = [x + Widget.scale * 4.5, y + h - 3.5 * Widget.scale, Widget.scale * 2, Widget.scale * 2] as Rect;
		const maximize = [x + Widget.scale * 7.5, y + h - 3.5 * Widget.scale, Widget.scale * 2, Widget.scale * 2] as Rect;

		if (mouseOver(close___)) squircle(close___, Widget.scale, 2, [0.1, 0.1, 0.1, 1], red, white, blank, this.texture, this.texture);
		if (mouseOver(minimize)) squircle(minimize, Widget.scale, 2, [0.1, 0.1, 0.1, 1], orange, white, blank, this.texture, this.texture);
		if (mouseOver(maximize)) squircle(maximize, Widget.scale, 2, [0.1, 0.1, 0.1, 1], green, white, blank, this.texture, this.texture);
		glass([x + Widget.scale / 2, y + Widget.scale / 2, 20 * Widget.scale, h - Widget.scale], Widget.scale * 3.5, 3, glassAlbedo, glassEmission, this.texture, this.texture);
		// lights front
		squircle(close___, Widget.scale, 2, [0.1, 0.1, 0.1, 1], mix(red, dark, mouseOver(close___) ? 0 : 0.5), blank, blank, this.texture, this.texture);
		squircle(minimize, Widget.scale, 2, [0.1, 0.1, 0.1, 1], mix(orange, dark, mouseOver(minimize) ? 0 : 0.5), blank, blank, this.texture, this.texture);
		squircle(maximize, Widget.scale, 2, [0.1, 0.1, 0.1, 1], mix(green, dark, mouseOver(maximize) ? 0 : 0.5), blank, blank, this.texture, this.texture);
		none(padded, this.texture, Shader.screen);
	}
}
