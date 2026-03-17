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
uniform float angle;
uniform float radius;
uniform sampler2D tex;

#define MAX_SAMPLES 64

vec4 safeSample(sampler2D tex, vec2 position) {
	vec2 clamped = clamp(position, vec2(0.0), vec2(1.0));
	vec2 overshoot = position - clamped;
	return texture(tex, clamped - overshoot);
}

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	uv = clamp(uv, 0.0, 1.0);
	// Compute squircle mask
	float nx = abs((2.0 * gl_FragCoord.x - (2.0 * rect.x + rect.z)) / rect.z);
	float ny = abs((2.0 * gl_FragCoord.y - (2.0 * rect.y + rect.w)) / rect.w);
	float dx = abs(max(nx - (1.0 - c.x), 0.0) / c.x);
	float dy = abs(max(ny - (1.0 - c.y), 0.0) / c.y);
	float inside = pow(dx, power) + pow(dy, power);
	float px = 1.0 / length(resolution.xy);
	float mask = pow(max(0.0, min(1.0, 1.0 - inside)), 4.0);
	vec4 back = texture(tex, gl_FragCoord.xy / resolution.xy);
	vec4 blurred = vec4(0.0);
	int nSamples = int(clamp(radius * 0.5, 1.0, float(MAX_SAMPLES)));
	vec2 dir = vec2(cos(angle), sin(angle));

	for (int i = 0; i < MAX_SAMPLES; i++) {
		if (i >= nSamples) break;

		float t = (float(i) + 0.5) / float(nSamples);
		float currentRadius = radius * (1.0 - t);
		vec2 offset = dir * px * currentRadius;

		blurred += safeSample(tex, clamp(uv + offset, 0.0, 1.0));
		blurred += safeSample(tex, clamp(uv - offset, 0.0, 1.0));
	}

	blurred = blurred / float(nSamples * 2);

	finalColor = mix(back, blurred, mask);
}`;

const shader = new Shader(fs, {
	c: "vec2",
	power: "float",
	tex: "sampler2D",
	angle: "float",
	radius: "float",
});

const middle = Shader.createTexture();

export default function shadowBlur (
	rect: Rect,
	radius: number, power: number,
	blurRadius: number, angle: number = 0,
	from: WebGLTexture = Shader.screen,
	to: WebGLTexture = Shader.screen,
) {
	Shader.clear(middle);
	none(rect, from, middle);
	shader.uniform.tex.set(middle);
	shader.uniform.radius.set(blurRadius);
	shader.uniform.power.set(power);
	shader.uniform.angle.set(angle);
	shader.uniform.c.set([
		radius / (rect[2] * 0.5),
		radius / (rect[3] * 0.5)
	]);	
	shader.renderToTexture(to, rect);
}