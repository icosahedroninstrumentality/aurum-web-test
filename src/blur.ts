import { Shader } from "./shader";
import type { Rect } from "./types";

const fs = `#version 300 es
precision highp float;

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform vec2 resolution;
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
	
	vec2 px = 1.0 / resolution.xy;
	vec4 blurred = vec4(0.0);
	int nSamples = int(clamp(radius * 0.5, 1.0, float(MAX_SAMPLES)));
	vec2 dir = vec2(cos(angle), sin(angle));

	for (int i = 0; i < MAX_SAMPLES; i++) {
		if (i >= nSamples) break;

		float t = (float(i) + 0.5) / float(nSamples);
		float currentRadius = radius * (1.0 - t);
		vec2 offset = dir * px * currentRadius;

		blurred += safeSample(tex, uv + offset);
		blurred += safeSample(tex, uv - offset);
	}

	finalColor = blurred / float(nSamples * 2);
}
`;

const shader = new Shader(fs, {
	angle: "float",
	radius: "float",
	tex: "sampler2D",
});

export default function blur (
	rect: Rect,
	angle: number,
	radius: number,
	from: WebGLTexture,
	to: WebGLTexture,
) {
	shader.uniform.angle.set(angle);
	shader.uniform.radius.set(radius);
	shader.uniform.tex.set(from);
	shader.renderToTexture(to, rect);
}