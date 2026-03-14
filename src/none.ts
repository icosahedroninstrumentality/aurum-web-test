import { Shader } from "./shader";
import type { Rect } from "./types";

// --- Example fragment shader ---
const fragmentSource = `#version 300 es
precision highp float;

out vec4 finalColor;

uniform vec2 resolution;
uniform int override;
uniform vec4 rect;
uniform sampler2D tex;

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	if (override == 1) uv = (gl_FragCoord.xy - rect.xy) / rect.zw;
	finalColor = texture(tex, uv);
}`;

const shader = new Shader(fragmentSource, {
	tex: "sampler2D",
	override: "int",
});

export default function none (
	rect: Rect,
	from: WebGLTexture, to?: WebGLTexture,
	overrideResolution: boolean = false,
) {
	shader.uniform.tex.set(from);
	shader.uniform.override.set(overrideResolution ? 1 : 0);
	!to ? shader.draw(rect) : shader.renderToTexture(to, rect);
}