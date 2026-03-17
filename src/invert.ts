import { blank, white } from "./colors";
import none from "./none";
import { Shader } from "./shader";
import type { Rect, RGBA } from "./types";

const fs = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform vec2 resolution;
uniform vec4 rect;

uniform vec2 c;
uniform float radius;
uniform float power;

uniform vec4 fg_albedo;
uniform vec4 fg_emission;
uniform vec4 bg_albedo;
uniform vec4 bg_emission;

uniform sampler2D tex;

void main() {
	float nx = abs((2.0 * gl_FragCoord.x - (2.0 * rect.x + rect.z)) / rect.z);
	float ny = abs((2.0 * gl_FragCoord.y - (2.0 * rect.y + rect.w)) / rect.w);
	float dx = abs(max(nx - (1.0 - c.x), 0.0) / c.x);
	float dy = abs(max(ny - (1.0 - c.y), 0.0) / c.y);
	float inside = pow(dx, power) + pow(dy, power);
	float px = 1.0 / length(resolution.xy);
	float mask = smoothstep(0.0, 1.0, max(0.0, 1.0 - pow(inside, radius / 2.0)));

	vec4 back = vec4(1.0) - texture(tex, gl_FragCoord.xy / resolution.xy);
	finalColor = mix(back * bg_albedo + bg_emission, back * fg_albedo + fg_emission, mask);
	finalColor.a = 1.0;
}`;

const shader = new Shader(fs, {
	radius: "float",
	c: "vec2",
	power: "float",
	fg_albedo: "vec4",
	fg_emission: "vec4",
	bg_albedo: "vec4",
	bg_emission: "vec4",
	tex: "sampler2D",
});

const middle = Shader.createTexture();

export default function invert (
	rect: Rect,
	radius: number, power: number,
	fg_albedo: RGBA = blank,
	fg_emission: RGBA = white,
	bg_albedo: RGBA = white,
	bg_emission: RGBA = blank,
	from: WebGLTexture = Shader.screen,
	to: WebGLTexture | null = Shader.screen,
) {
	Shader.clear(middle);
	none(rect, from, middle);
	shader.uniform.tex.set(middle);
	shader.uniform.power.set(power);
	shader.uniform.radius.set(radius);
	shader.uniform.c.set([
		radius / (rect[2] * 0.5),
		radius / (rect[3] * 0.5)
	]);	
	shader.uniform.fg_albedo.set(fg_albedo);
	shader.uniform.fg_emission.set(fg_emission);
	shader.uniform.bg_albedo.set(bg_albedo);
	shader.uniform.bg_emission.set(bg_emission);
	if (to === null) return shader.draw(rect);
	shader.renderToTexture(to, rect);
}