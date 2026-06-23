import blur from "./blur";
import { glassAlbedo, glassEmission } from "./colors";
import none from "./none";
import { Shader } from "./shader";
import type { Rect, RGBA, Vec2, Vec4 } from "./types";

// --- Example fragment shader ---
const fragmentSource = `#version 300 es
precision highp float;

out vec4 finalColor;

uniform vec2 resolution;
uniform vec4 rect;

uniform int shapeCount;
uniform vec4 srect[16];
uniform vec4 corner[16]; // cx, cy, radius, power per shape

uniform vec4 albedo;
uniform vec4 emission;
uniform vec3 sheenColor;
uniform float sheenRot;
uniform sampler2D blur;
uniform sampler2D back;

vec4 safeSample (sampler2D blur, vec2 position) {
    vec2 clamped = clamp(position, vec2(0.0), vec2(1.0));
    vec2 overshoot = position - clamped;
    return texture(blur, clamped - overshoot);
}

// Returns the inside value and shape index for the closest shape
vec2 calculateInsideWithIndex (vec2 position) {
    float minValue = 1e6;
    int minIndex = 0;
    
    for (int i = 0; i < shapeCount; i++) {
        vec4 s = srect[i];
        vec4 c = corner[i];
        
        // Normalized coordinates within the shape's bounding box
        vec2 p = (position - s.xy) / s.zw;
        
        // Distance to edges with corner radius
        vec2 d = abs(p * 2.0 - 1.0);
        vec2 cornerRadius = vec2(c.x, c.y);
        vec2 overshoot = max(d - (1.0 - cornerRadius), 0.0);
        
        // Distance field using per-shape power
        float value = pow(abs(overshoot.x / cornerRadius.x), c.w) + 
                      pow(abs(overshoot.y / cornerRadius.y), c.w);
        
        if (value < minValue) {
            minValue = value;
            minIndex = i;
        }
    }
    
    return vec2(minValue, float(minIndex));
}

void main () {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    uv = clamp(uv, 0.0, 1.0);
    
    // Check if outside the main rect
    if (gl_FragCoord.x < rect.x || 
        gl_FragCoord.y < rect.y || 
        gl_FragCoord.x > rect.x + rect.z || 
        gl_FragCoord.y > rect.y + rect.w) {
        finalColor = texture(back, uv);
        return;
    }
    
    vec2 result = calculateInsideWithIndex(gl_FragCoord.xy);
    float inside = result.x;
    int shapeIdx = int(result.y);
    
    // Outside all shapes
    if (inside > 1.0) {
        finalColor = texture(back, uv);
        return;
    }
    
    // Get per-shape radius and power
    float shapeRadius = corner[shapeIdx].z;
    float shapePower = corner[shapeIdx].w;
    
    float mask = smoothstep(0.0, 1.0, max(0.0, 1.0 - pow(inside, shapeRadius / 2.0)));
    float invMask = smoothstep(1.0, 0.0, max(0.0, 1.0 - pow(inside, shapeRadius / 32.0)));
    
    // Calculate gradient for refraction direction
    float insideC = inside;
    vec2 resultX = calculateInsideWithIndex(gl_FragCoord.xy + vec2(1.0, 0.0));
    vec2 resultY = calculateInsideWithIndex(gl_FragCoord.xy + vec2(0.0, 1.0));
    float insideX = resultX.x;
    float insideY = resultY.x;
    
    vec2 grad = vec2(insideX - insideC, insideY - insideC);
    vec2 dir_ = normalize(grad + 1e-5);
    float r_ = insideC;
    
    float radiusfix = max(1.0, 1.5 * log(shapeRadius));
    float curvature = pow(r_, 5.0 + 1.0 / shapePower + shapeRadius * 0.05);
    
    vec2 offset = dir_ * curvature / resolution.xy * 16.0 * radiusfix;
    
    // Chromatic aberration
    float abberation = 1.5;
    vec4 refracted = vec4(0.0);
    vec4 reflected = vec4(0.0);
    
    refracted.r = safeSample(blur, uv - offset * abberation).r;
    refracted.g = safeSample(blur, uv - offset).g;
    refracted.b = safeSample(blur, uv - offset / abberation).b;
    
    reflected.r = safeSample(blur, uv + (offset * 0.2) * abberation).r;
    reflected.g = safeSample(blur, uv + (offset * 0.2)).g;
    reflected.b = safeSample(blur, uv + (offset * 0.2) / abberation).b;
    
    refracted.a = 1.0;
    
    // Sheen effect
    vec2 sheenDir = vec2(sin(sheenRot), cos(sheenRot));
    float streak = abs(dot(dir_, sheenDir));
    float sheenMask = curvature * streak * pow(invMask, 6.0);
    
    finalColor = mix(
        safeSample(back, uv),
        (refracted * albedo + reflected * curvature + emission) + 
        vec4(sheenColor * sheenMask, 0.0),
        mask
    );

	finalColor += vec4(1.0);
}`;

const shader = new Shader(fragmentSource, {
	corner: "vec4[]",
	srect: "vec4[]",
	sheenRot: "float",
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

export class Squircle {
	constructor (
		public readonly x: number = 0,
		public readonly y: number = 0,
		public readonly w: number = 0,
		public readonly h: number = 0,
		public readonly r: number = 0,
		public readonly p: number = 1,
	) {}
}

export default function glassMorph (
	rect: Rect,
	squircles: Squircle[],
	albedo: RGBA = glassAlbedo, emission: RGBA = glassEmission,
	from: WebGLTexture = Shader.screen, to: WebGLTexture | null = Shader.screen,
	blurAmount: number = 0,
) {
	const srects: number[] = [];
	const corners: number[] = [];
	for (let i = 0; i < squircles.length; i++) {
		srects.push(...[squircles[i].x, squircles[i].y, squircles[i].w, squircles[i].h]);
		corners.push(...[squircles[i].r / (squircles[i].w * 0.5), squircles[i].r / (squircles[i].h * 0.5), squircles[i].r, squircles[i].p])
	}
	console.log(srects, corners);
	
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
	shader.uniform.srect.set(srects);
	shader.uniform.corner.set(corners);
	shader.uniform.back.set(b);
	shader.uniform.albedo.set(albedo);
	shader.uniform.emission.set(emission);
	shader.uniform.sheenRot.set(Math.PI * 0.75);
	const h = rgbToHue(emission[0], emission[1], emission[2]);
	const sheenRGB = hslToRgb(h, 0.5, 0.75);
	shader.uniform.sheenColor.set(sheenRGB);
	if (to) shader.renderToTexture(to, rect); else shader.draw(rect);
}
