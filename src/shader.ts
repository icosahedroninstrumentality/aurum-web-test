import type { Rect } from "./types";

type UniformType =
| "float" | "int"
| "vec2" | "vec3" | "vec4"
| "mat3" | "mat4"
| "sampler2D"
| "float[]"
| "int[]"
| "vec2[]"
| "vec3[]"
| "vec4[]"
| "mat3[]"
| "mat4[]"
| "sampler2D[]";

type UniformTypeToValueType<T extends UniformType> =
T extends "sampler2D" ? WebGLTexture :
T extends "sampler2D[]" ? WebGLTexture[] :
T extends "float" | "int" ? number :
T extends "float[]" | "int[]" ? number[] :
number[];

class Uniform<T> {
	public value!: T;
	
	constructor(
		public shader: Shader<any>,
		private loc: WebGLUniformLocation,
		public readonly type: UniformType
	) { }
	
	set(v: T) {
		this.value = v;
	}
	
	upload(texUnit = 0) {
		const v: any = this.value;
		const gl = Shader.gl;
		
		switch (this.type) {
			case "float": gl.uniform1f(this.loc, v); break;
			case "int": gl.uniform1i(this.loc, v); break;
			
			case "float[]": gl.uniform1fv(this.loc, v); break;
			case "int[]": gl.uniform1iv(this.loc, v); break;
			
			case "vec2": gl.uniform2fv(this.loc, v); break;
			case "vec3": gl.uniform3fv(this.loc, v); break;
			case "vec4": gl.uniform4fv(this.loc, v); break;
			
			case "vec2[]": gl.uniform2fv(this.loc, v); break;
			case "vec3[]": gl.uniform3fv(this.loc, v); break;
			case "vec4[]": gl.uniform4fv(this.loc, v); break;
			
			case "mat3": gl.uniformMatrix3fv(this.loc, false, v); break;
			case "mat4": gl.uniformMatrix4fv(this.loc, false, v); break;
			
			case "mat3[]": gl.uniformMatrix3fv(this.loc, false, v); break;
			case "mat4[]": gl.uniformMatrix4fv(this.loc, false, v); break;
			
			case "sampler2D":
			gl.activeTexture(gl.TEXTURE0 + texUnit);
			gl.bindTexture(gl.TEXTURE_2D, v);
			gl.uniform1i(this.loc, texUnit);
			break;
			
			case "sampler2D[]":
			const units = [];
			for (let i = 0; i < v.length; i++) {
				gl.activeTexture(gl.TEXTURE0 + texUnit + i);
				gl.bindTexture(gl.TEXTURE_2D, v[i]);
				units.push(texUnit + i);
			}
			gl.uniform1iv(this.loc, units);
			break;
		}
	}
}

function isMobileDevice() {
	return (
		matchMedia("(pointer: coarse)").matches ||
		"ontouchstart" in window
	);
}

export class Shader<U extends Record<string, UniformType>> {
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private buf: WebGLBuffer;
	
	public uniform: { [K in keyof U]: Uniform<UniformTypeToValueType<U[K]>> } = {} as any;
	public static readonly canvas = (() => {
		const canvas = document.querySelector("canvas")!;
		
		// Get CSS size for layout
		canvas.style.width  = "100vw";
		canvas.style.height = "100vh";
		const rect = canvas.getBoundingClientRect();
		
		// DPR only on mobile
		const dpr = isMobileDevice() ? (window.devicePixelRatio || 1) : 1;
		
		canvas.width  = Math.max(Math.round(rect.width  * dpr), window.screen.width);
		canvas.height = Math.max(Math.round(rect.height * dpr), window.screen.height);
		
		return canvas;
	})();
	public static readonly gl: WebGL2RenderingContext = Shader.canvas.getContext("webgl2", {
		premultipliedAlpha: true,  // Changed to false for simplicity
		alpha: true
	})!;
	
	public static readonly screen = Shader.createTexture();
	public static readonly none = Shader.createTexture();
	public static readonly fullscreen: Rect = [0, 0, Shader.canvas.width, Shader.canvas.height];
	
	constructor(fragmentSource: string, uniforms: U) {
		const vs = this.compile(Shader.gl.VERTEX_SHADER, Shader.vertexSource);
		const fs = this.compile(Shader.gl.FRAGMENT_SHADER, fragmentSource);
		
		const prog = Shader.gl.createProgram()!;
		Shader.gl.attachShader(prog, vs);
		Shader.gl.attachShader(prog, fs);
		Shader.gl.linkProgram(prog);
		if (!Shader.gl.getProgramParameter(prog, Shader.gl.LINK_STATUS))
			throw Shader.gl.getProgramInfoLog(prog);
		
		this.program = prog;
		
		// Clean up shaders after linking
		Shader.gl.deleteShader(vs);
		Shader.gl.deleteShader(fs);
		
		// VAO + buffer
		this.vao = Shader.gl.createVertexArray()!;
		Shader.gl.bindVertexArray(this.vao);
		
		this.buf = Shader.gl.createBuffer()!;
		Shader.gl.bindBuffer(Shader.gl.ARRAY_BUFFER, this.buf);
		
		const loc = Shader.gl.getAttribLocation(prog, "a_pos");
		Shader.gl.enableVertexAttribArray(loc);
		Shader.gl.vertexAttribPointer(loc, 2, Shader.gl.FLOAT, false, 0, 0);
		
		Shader.gl.useProgram(prog);
		
		// Resolution & rect uniforms
		const rectLoc = Shader.gl.getUniformLocation(prog, "rect");
		if (rectLoc) (this.uniform as any).rect = new Uniform(this, rectLoc, "vec4");
		const resLoc = Shader.gl.getUniformLocation(prog, "resolution");
		if (resLoc) (this.uniform as any).resolution = new Uniform(this, resLoc, "vec2");
		
		// User-defined uniforms
		for (const [name, type] of Object.entries(uniforms) as any) {
			const loc = Shader.gl.getUniformLocation(prog, name);
			if (loc === null) throw `Missing uniform ${name}`;
			(this.uniform as any)[name] = new Uniform(this, loc, type);
		}
	}
	
	draw(rect: [number, number, number, number], fromTex: boolean = false) {
		const gl = Shader.gl;
		
		if (!fromTex) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}
		
		// Set viewport to match the entire canvas for full-screen rendering
		gl.viewport(...rect);
		
		// Always use full-screen quad [-1, 1]
		const quad = new Float32Array([
			-1, -1, 1, -1, -1, 1,
			-1, 1, 1, -1, 1, 1
		]);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
		
		// Enable blending if needed
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(
			gl.SRC_ALPHA,
			gl.ONE_MINUS_SRC_ALPHA,
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA
		);
		gl.blendEquation(gl.FUNC_ADD);
		
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);
		
		// Update uniforms
		if ((this.uniform as any).rect) (this.uniform as any).rect.set(rect);
		if ((this.uniform as any).resolution) (this.uniform as any).resolution.set([Shader.canvas.width, Shader.canvas.height]);
		
		let texUnit = 0;
		for (const u of Object.values(this.uniform)) {
			if (u.type === "sampler2D") u.upload(texUnit++);
			else u.upload();
		}
		
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
	
	renderToTexture(texture: WebGLTexture, rect: [number, number, number, number]) {
		const gl = Shader.gl;
		const fb = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		
		this.draw(rect, true);
		
		gl.deleteFramebuffer(fb);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
	
	static createTexture(width?: number, height?: number): WebGLTexture {
		const gl = Shader.gl;
		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		
		const texWidth = width || Shader.canvas.width;
		const texHeight = height || Shader.canvas.height;
		
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		const ext = gl.getExtension('EXT_texture_filter_anisotropic');
		if (ext) {
			gl.texParameterf(
				gl.TEXTURE_2D,
				ext.TEXTURE_MAX_ANISOTROPY_EXT,
				gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
			);
		}
		
		// Set unpack alignment for proper texture loading
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		
		Shader.clear(tex);
		
		return tex;
	}
	
	static clear(texture: WebGLTexture) {
		const gl = Shader.gl;
		const fb = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.deleteFramebuffer(fb);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
	
	private compile(type: number, src: string) {
		const gl = Shader.gl;
		const s = gl.createShader(type)!;
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
			throw gl.getShaderInfoLog(s);
		return s;
	}
	
	private static vertexSource = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
	
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  // Convert from clip space [-1,1] to UV space [0,1]
  v_uv = a_pos * 0.5 + 0.5;
}`;
}

// Initialize canvas
if (!Shader.gl) throw "WebGL2 required";

