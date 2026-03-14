import { black, blank, glassAlbedo, glassEmission, mix, white } from "./colors";
import glass from "./glass";
import { Pointer } from "./input";
import { loadTexture } from "./loadTexture";
import none from "./none";
import { Shader } from "./shader";
import squircle from "./squircle";
import Widget from "./widget";

//const wallpaper = await loadTexture("/Wallpaper/Crystal/Purple/image.jpg");
//const wallpaper = await loadTexture("/image copy.png");
//const wallpaper = await loadTexture("/Wallpaper/Gold/Chunks/image.jpg");
const wallpaper = await loadTexture("/Wallpaper/Glass/Color/image.jpg");
//const wallpaper = await loadTexture("/noirlab2521ai.png");
//const wallpaper = await loadTexture("/Wallpaper/Tahoe/26-Tahoe-Beach-Dawn.png");
//const wallpaper = await loadTexture("/board.jpg");
const m = 16;
const widget = new Widget();

let shouldDraw = false;

function drawDock () {
	const height = m * 8;
	const radius = height / 2;
	const iconSize = height - m * 2;
	const width = (iconSize + m) * 9 + m;
	const doffset = Shader.canvas.width / 2 - width / 2;
	const iconRadius = iconSize / 2;
	function drawIcon (offset: number) {
		const i = offset;
		glass(
			[doffset + m + (iconSize + m) * offset, m * 2, iconSize, iconSize],
			iconRadius, 3,
			mix(glassAlbedo, blank, 0.5),
			[
				Math.cos(i) * 0.75,
				Math.cos(i + 30) * 0.75,
				Math.cos(i + 60) * 0.75,
				1,
			],
		);
	}
	glass([doffset, m, width, height], radius, 3);
	for (let i = 0; i < 9; i++) drawIcon(i);
}

function drawBar (yOffset: number = 0) {		
	const height = m * 4;
	const radius = height / 2;
	const width = Shader.canvas.width - m * 2;
	const iconSize = height - m * 2;
	const iconRadius = iconSize / 2;
	function drawIcon (offset: number) {
		const i = offset;
		glass(
			[m * 2 + (iconSize * 2 + m) * offset, Shader.canvas.height - height + yOffset, iconSize * 2, iconSize],
			iconRadius, 2,
			mix(glassAlbedo, blank, 0.5),
			[
				Math.cos(i) * 0.75,
				Math.cos(i + 30) * 0.75,
				Math.cos(i + 60) * 0.75,
				1,
			],
		);
	}
	glass([m, Shader.canvas.height - height - m + yOffset, width, height], radius, 2);
	for (let i = 0; i < 7; i++) drawIcon(i);
}

function animate () {
	if (!shouldDraw) {
		Shader.clear(Shader.screen); // Keep the GPU minimally busy so there's no spinup on change
		return requestAnimationFrame(animate);
	}
	shouldDraw = true;
	Shader.clear(Shader.screen);

	//wallpaper
	//squircle(Shader.fullscreen, 64, 3, white, blank, blank, blank, wallpaper, Shader.screen);
	none(Shader.fullscreen, wallpaper, Shader.screen, true);
	
	// window
	widget.draw();
	glass([500, 300, 200, 200], 100, 2);
	// stuff
	drawBar(96 * Math.pow(0.5 + 0.5 * Math.sin(Date.now() / 1000), 10));
	drawDock();
	
	
	// mouse
	//squircle([Pointer.position[0] - 12, Pointer.position[1] - 12, 24, 24], 12, 2, blank, white, white, blank);
	//squircle([Pointer.position[0] - 8, Pointer.position[1] - 8, 16, 16], 8, 2, blank, white, white, blank);
	glass([Pointer.position[0] - 24, Pointer.position[1] - 24, 48, 48], 24, 2, mix(glassAlbedo, black, 0.5), glassEmission);
	glass([Pointer.position[0] - 16, Pointer.position[1] - 16, 32, 32], 16, 2, glassAlbedo, mix(white, glassEmission, 0.5));
	//glass([Pointer.position[0] - 32, Pointer.position[1] - 32, 64, 64], 32, 2);
	
	// glass-overlay
	glass([0, Pointer.position[1], Shader.fullscreen[2], Shader.fullscreen[3]], 64, 3, white, blank, Shader.screen, Shader.screen, 0);
	// draw screen
	squircle(Shader.fullscreen, 64, 3, white, blank, blank, blank, Shader.screen, null);
	fps++;
	requestAnimationFrame(animate);
}

setInterval(() => {
	const count = fps;
	fps = 0;
	fpsD.innerText = count + "FPS";
}, 1000);

animate();

const onMouseMove = (e: MouseEvent) => {
	const dx = e.movementX / Math.PI;
	const dy = -e.movementY / Math.PI;
	
	Pointer.position[0] = Math.min(Shader.canvas.width, Math.max(0, Pointer.position[0] + dx));
	Pointer.position[1] = Math.min(Shader.canvas.height, Math.max(0, Pointer.position[1] + dy));
	
	if (e.shiftKey) {
		widget.rect[0] += dx;
		widget.rect[1] += dy;
	} else if (e.ctrlKey) {
		widget.rect[2] += dx;
		widget.rect[3] += dy;
	} else if (e.altKey) {
	} else {
	}
	
	widget.rect[2] = Math.max(256, widget.rect[2]);
	widget.rect[3] = Math.max(256, widget.rect[3]);
	
	widget.rect[2] = Math.min(widget.rect[2], Shader.canvas.width);
	widget.rect[3] = Math.min(widget.rect[3], Shader.canvas.height);
	
	widget.rect[0] = Math.max(0, Math.min(Shader.canvas.width - widget.rect[2], widget.rect[0]));
	widget.rect[1] = Math.max(0, Math.min(Shader.canvas.height - widget.rect[3], widget.rect[1]));
	
	shouldDraw = true;
};

let fps = 0;
shouldDraw = true;
//setInterval(() => {shouldDraw = true;}, 1);
const fpsD = document.createElement("a");
fpsD.style.zIndex = "1000000";
fpsD.style.fontSize = "32px";
fpsD.style.position = "absolute";
document.body.appendChild(fpsD);

const onPointerLockChange = () => {
	if (document.pointerLockElement === Shader.canvas) {
		window.addEventListener("mousemove", onMouseMove);
	} else {
		window.removeEventListener("mousemove", onMouseMove);
	}
};

const onClick = (e: MouseEvent) => {
	try {
		Shader.canvas.requestPointerLock();
	} catch (err) { console.warn(err); }
};

document.addEventListener("pointerlockchange", onPointerLockChange);
window.addEventListener("click", onClick);
window.addEventListener("keydown", (ev) => ev.preventDefault());
window.addEventListener("keyup", (ev) => ev.preventDefault());
window.addEventListener("keypress", (ev) => {
	ev.preventDefault();
	if (ev.metaKey) {
		alert("CAUGHT META")
	}
});
