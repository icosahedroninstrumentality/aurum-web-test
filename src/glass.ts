import blur from "./blur";
import { glassAlbedo, glassEmission } from "./colors";
import none from "./none";
import { Shader } from "./shader";
import type { Rect, RGBA, Vec2 } from "./types";

// --- Example fragment shader ---
const fragmentSource = `#version 300 es
precision highp float;

out vec4 finalColor;

uniform vec2 resolution;
uniform vec4 rect;

uniform vec2 c;
uniform float sheenRot;
uniform float radius;
uniform float power;
uniform vec4 albedo;
uniform vec4 emission;
uniform vec3 sheenColor;
uniform sampler2D blur;
uniform sampler2D back;

vec4 safeSample (sampler2D blur, vec2 position) {
	vec2 clamped = clamp(position, vec2(0.0), vec2(1.0));
	vec2 overshoot = position - clamped;
	return texture(blur, clamped - overshoot);
}

vec2 va (vec2 a, vec2 r) {
	if (a.x < 0.0) {
		a.x -= r.x;
	} else {
		a.x += r.x;
	}
	if (a.y < 0.0) {
		a.y -= r.y;
	} else {
		a.y += r.y;
	}
	return a;
}

float calculateInside (vec2 Sposition, vec4 Srect, vec2 Sc, float Spower) {
	return pow(abs(max(abs((2.0 * Sposition.x - (2.0 * Srect.x + Srect.z)) / Srect.z) - (1.0 - Sc.x), 0.0) / Sc.x), Spower) + pow(abs(max(abs((2.0 * Sposition.y - (2.0 * Srect.y + Srect.w)) / Srect.w) - (1.0 - Sc.y), 0.0) / Sc.y), Spower);
}

void main () {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
	uv = clamp(uv, 0.0, 1.0);
	
	if (gl_FragCoord.x < rect.x) { finalColor = texture(back, uv); return;}
	if (gl_FragCoord.y < rect.y) { finalColor = texture(back, uv); return;}
	if (gl_FragCoord.x > rect.x + rect.z) { finalColor = texture(back, uv); return;}
	if (gl_FragCoord.y > rect.y + rect.w) { finalColor = texture(back, uv); return;}

	float inside = calculateInside(gl_FragCoord.xy, rect, c, power);
	
	if (inside > 1.0) { finalColor = texture(back, uv); return;}

	float mask =	smoothstep(0.0, 1.0, max(0.0, 1.0 - pow(inside, radius / 2.0)));
	float invMask = smoothstep(1.0, 0.0, max(0.0, 1.0 - pow(inside, radius / 32.0)));

	float insideC = calculateInside(gl_FragCoord.xy, rect, c, power);
	float insideX = calculateInside(gl_FragCoord.xy + vec2(1.0,0.0), rect, c, power);
	float insideY = calculateInside(gl_FragCoord.xy + vec2(0.0,1.0), rect, c, power);

	vec2 grad = vec2(insideX - insideC, insideY - insideC);
	vec2 dir_ = normalize(grad + 1e-5);
	float r_ = insideC;

	float radiusfix = max(1.0, 1.5 * log(radius)); // fix for large radius object

	float curvature = pow(r_, 2.0);

	vec2 offset = dir_ * curvature // curve function
	/ resolution.xy * 16.0 // CHILL OUT
	* radiusfix;
	
	//offset.y *= 1.5; // fighing some stupid bug

	vec4 refracted = vec4(0.0);
	vec4 reflected = vec4(0.0);
	
	refracted.r = safeSample(blur, uv - offset / 1.1).r;
	refracted.g = safeSample(blur, uv - offset).g;
	refracted.b = safeSample(blur, uv - offset * 1.1).b;
	
	reflected.r = safeSample(blur, uv + offset * 0.2 / 1.2).r;
	reflected.g = safeSample(blur, uv + offset * 0.2).g;
	reflected.b = safeSample(blur, uv + offset * 0.2 * 1.2).b;
	
	refracted.a = 1.0;

	vec2 sheenDir = vec2(sin(sheenRot), cos(sheenRot));
	float streak = abs(dot(dir_, sheenDir));

	float sheenMask =
		curvature *
		streak *
		pow(invMask, 6.0);

	finalColor = mix(safeSample(back, uv), (refracted * albedo + reflected * curvature + emission) + vec4(sheenColor * sheenMask, 0.0), mask);
}`;

const shader = new Shader(fragmentSource, {
	c: "vec2",
	sheenRot: "float",
	radius: "float",
	power: "float",
	albedo: "vec4",
	emission: "vec4",
	blur: "sampler2D",
	back: "sampler2D",
	sheenColor: "vec3",
});

const a = Shader.createTexture();
const b = Shader.createTexture();

function rgbToHue(r: number, g: number, b: number) {
	const max = Math.max(r,g,b);
	const min = Math.min(r,g,b);
	const d = max - min;
	if (d === 0) return 0;
	
	let h;
	switch (max) {
		case r: h = (g-b)/d % 6; break;
		case g: h = (b-r)/d + 2; break;
		default: h = (r-g)/d + 4;
	}
	return (h/6 + 1) % 1;
}

function hslToRgb(h: number, s: number, l: number): [number,number,number] {
	const a = s * Math.min(l, 1-l);
	const f = (n: number) => {
		const k = (n + h*12) % 12;
		return l - a * Math.max(-1, Math.min(k-3, Math.min(9-k,1)));
	};
	return [f(0), f(8), f(4)];
}

export default function glass (
	rect: Rect,
	radius: number, power: number,
	albedo: RGBA = glassAlbedo, emission: RGBA = glassEmission,
	from: WebGLTexture = Shader.screen, to: WebGLTexture | null = Shader.screen,
	blurAmount: number = 0,
) {
	const c = [
		radius / (rect[2] * 0.5),
		radius / (rect[3] * 0.5)
	] as Vec2;
	const pad = [32, 32] as Vec2;
	const padded: Rect = [
		Math.min(Shader.canvas.width, (Math.max(0, rect[0] - pad[0]))),
		Math.min(Shader.canvas.height, (Math.max(0, rect[1] - pad[1]))),
		Math.min(Shader.canvas.width - (rect[0] - rect[2] - pad[0]), (Math.max(0, rect[2] + pad[0] * 2))),
		Math.min(Shader.canvas.height - (rect[1] - rect[3] - pad[1]), (Math.max(0, rect[3] + pad[1] * 2))),
	];
	if (blurAmount === 0) {
		Shader.clear(b);
		none(padded, from, b);
		shader.uniform.blur.set(b);
	} else {
		Shader.clear(a);
		Shader.clear(b);
		blur(padded, Math.PI * 0,   blurAmount, from, a);
		blur(padded, Math.PI * 1/3, blurAmount, a, b);
		blur(padded, Math.PI * 2/3, blurAmount, b, a);
		
		Shader.clear(b);
		none(padded, from, b);
		shader.uniform.blur.set(a);
	}
	shader.uniform.back.set(b);
	shader.uniform.radius.set(radius);
	shader.uniform.power.set(power);
	shader.uniform.albedo.set(albedo);
	shader.uniform.emission.set(emission);
	shader.uniform.c.set(c);
	shader.uniform.sheenRot.set(Math.PI * 0.75);
	const h = rgbToHue(emission[0], emission[1], emission[2]);
	const sheenRGB = hslToRgb(h, 0.5, 0.75);
	shader.uniform.sheenColor.set(sheenRGB);
	if (to) shader.renderToTexture(to, rect); else shader.draw(rect);
}
