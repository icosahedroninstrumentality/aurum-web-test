import { Shader } from "./shader";

// --- Load a texture ---
export async function loadTexture(url: string): Promise<WebGLTexture> {
	const img = new Image();
	img.src = url;
	await img.decode();

	const tex = Shader.gl.createTexture()!;
	Shader.gl.bindTexture(Shader.gl.TEXTURE_2D, tex);
	Shader.gl.pixelStorei(Shader.gl.UNPACK_FLIP_Y_WEBGL, true);
	Shader.gl.texImage2D(Shader.gl.TEXTURE_2D, 0, Shader.gl.RGBA, Shader.gl.RGBA, Shader.gl.UNSIGNED_BYTE, img);
	Shader.gl.texParameteri(Shader.gl.TEXTURE_2D, Shader.gl.TEXTURE_MIN_FILTER, Shader.gl.LINEAR);
	Shader.gl.texParameteri(Shader.gl.TEXTURE_2D, Shader.gl.TEXTURE_MAG_FILTER, Shader.gl.LINEAR);
	Shader.gl.texParameteri(Shader.gl.TEXTURE_2D, Shader.gl.TEXTURE_WRAP_S, Shader.gl.CLAMP_TO_EDGE);
	Shader.gl.texParameteri(Shader.gl.TEXTURE_2D, Shader.gl.TEXTURE_WRAP_T, Shader.gl.CLAMP_TO_EDGE);

	return tex;
}
