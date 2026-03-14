// @ts-ignore - project does not currently include local typings for three
import { Mesh, MeshBasicMaterial, OrthographicCamera, Scene, WebGLRenderer } from "three";
import { Text } from "three-text/three";
import hbWasmUrl from "harfbuzzjs/hb.wasm?url";

import { Shader } from "./shader";
import none from "./none";
import type { Rect } from "./types";

const defaultFont = "/Font/SN_Pro/SNPro-VariableFont_wght.ttf";

export class ThreeTextOverlay {
	private static didInit = false;

	private readonly canvas = document.createElement("canvas");
	private readonly renderer: WebGLRenderer;
	private readonly scene = new Scene();
	private readonly camera = new OrthographicCamera(0, 1, 1, 0, -1000, 1000);
	private readonly material = new MeshBasicMaterial({
		color: 0xffffff,
		transparent: true,
	});
	private mesh: Mesh | null = null;

	private text = "";
	private font = defaultFont;
	private fontSize = 28;
	private needsTextBuild = true;
	private needsRedraw = true;
	private buildId = 0;
	private currentBuild: Promise<void> | null = null;
	private readonly texture = Shader.createTexture();

	public constructor() {
		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			alpha: true,
			antialias: true,
			premultipliedAlpha: false,
		});
		this.renderer.setClearColor(0x000000, 0);
		this.syncSize();
	}

	public async setText(text: string): Promise<void> {
		if (this.text === text) return;
		this.text = text;
		this.needsTextBuild = true;
		this.needsRedraw = true;
		await this.ensureTextBuilt();
	}

	public setFont(font: string): void {
		if (this.font === font) return;
		this.font = font;
		this.needsTextBuild = true;
		this.needsRedraw = true;
	}

	public setFontSize(size: number): void {
		if (this.fontSize === size) return;
		this.fontSize = size;
		this.needsTextBuild = true;
		this.needsRedraw = true;
	}

	public draw(rect: Rect, to: WebGLTexture | null = Shader.screen): void {
		this.syncSize();

		void this.ensureTextBuilt();

		if (this.needsRedraw) {
			this.renderOverlay(rect);
			this.uploadToTexture();
		}

		none(Shader.fullscreen, this.texture, to ?? undefined);
	}

	private async ensureTextBuilt(): Promise<void> {
		if (!this.needsTextBuild) return;
		if (!this.currentBuild) {
			this.currentBuild = this.rebuildText();
			void this.currentBuild.finally(() => {
				this.currentBuild = null;
			});
		}
		await this.currentBuild;
	}

	private syncSize(): void {
		const w = Shader.canvas.width;
		const h = Shader.canvas.height;
		if (this.canvas.width === w && this.canvas.height === h) return;

		this.canvas.width = w;
		this.canvas.height = h;
		this.renderer.setSize(w, h, false);
		this.camera.left = 0;
		this.camera.right = w;
		this.camera.top = 0;
		this.camera.bottom = h;
		this.camera.updateProjectionMatrix();

		Shader.gl.bindTexture(Shader.gl.TEXTURE_2D, this.texture);
		Shader.gl.texImage2D(Shader.gl.TEXTURE_2D, 0, Shader.gl.RGBA, w, h, 0, Shader.gl.RGBA, Shader.gl.UNSIGNED_BYTE, null);
		this.needsRedraw = true;
	}

	private async rebuildText(): Promise<void> {
		const buildId = ++this.buildId;
		this.needsTextBuild = false;

		if (!ThreeTextOverlay.didInit) {
			Text.setHarfBuzzPath(hbWasmUrl);
			ThreeTextOverlay.didInit = true;
		}

		try {
			const result = await Text.create({
				text: this.text,
				font: this.font,
				size: this.fontSize,
				depth: 0,
			});

			if (buildId !== this.buildId) {
				result.geometry.dispose();
				return;
			}

			if (this.mesh) {
				this.scene.remove(this.mesh);
				this.mesh.geometry.dispose();
			}

			const mesh = new Mesh(result.geometry, this.material);
			mesh.position.set(0, 0, 0);
			this.mesh = mesh;
			this.scene.add(mesh);
			this.needsRedraw = true;
		} catch (err) {
			console.warn("Failed to build three-text geometry", err);
		}
	}

	private renderOverlay(rect: Rect): void {
		this.renderer.clear(true, true, true);

		if (this.mesh) {
			const pad = 24;
			const x = rect[0] + pad;
			const y = rect[1] + pad;
			const bounds = this.mesh.geometry.boundingBox;
			const minX = bounds?.min.x ?? 0;
			const minY = bounds?.min.y ?? 0;
			this.mesh.position.set(x - minX, y - minY, 0);
		}

		this.renderer.render(this.scene, this.camera);
		this.needsRedraw = false;
	}

	private uploadToTexture(): void {
		const gl = Shader.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
	}
}
