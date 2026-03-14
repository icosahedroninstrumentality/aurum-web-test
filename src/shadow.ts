import none from "./none";
import { Shader } from "./shader";
import type { Rect } from "./types";

const fs = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform vec2 resolution;
uniform vec4 rect;

uniform vec2 c;
uniform float power;
uniform vec4 color;
uniform sampler2D tex;

void main() {
	// Compute squircle mask
	float nx = abs((2.0 * gl_FragCoord.x - (2.0 * rect.x + rect.z)) / rect.z);
	float ny = abs((2.0 * gl_FragCoord.y - (2.0 * rect.y + rect.w)) / rect.w);
	float dx = abs(max(nx - (1.0 - c.x), 0.0) / c.x);
	float dy = abs(max(ny - (1.0 - c.y), 0.0) / c.y);
	float inside = pow(dx, power) + pow(dy, power);
	float px = 1.0 / length(resolution.xy);
	float mask = pow(max(0.0, min(1.0, 1.0 - inside)), 4.0);
	vec4 back = texture(tex, gl_FragCoord.xy / resolution.xy);

	finalColor = mix(back, color, mask);
}`;

const shader = new Shader(fs, {
	c: "vec2",
	power: "float",
	color: "vec4",
	tex: "sampler2D",
});

const middle = Shader.createTexture();

export default function shadow (
	rect: Rect,
	radius: number, power: number,
	color: number[],
	from: WebGLTexture = Shader.screen,
	to: WebGLTexture = Shader.screen,
) {
	Shader.clear(middle);
	none(rect, from, middle);
	shader.uniform.tex.set(middle);
	shader.uniform.color.set(color);
	shader.uniform.power.set(power);
	shader.uniform.c.set([
		radius / (rect[2] * 0.5),
		radius / (rect[3] * 0.5)
	]);	
	shader.renderToTexture(to, rect);
}