import { black, blank, glassAlbedo, glassEmission, mix, white } from "./colors";
import glass from "./glass";
import { Pointer } from "./input";
import { loadTexture } from "./loadTexture";
import none from "./none";
import { Shader } from "./shader";
import shadowBlur from "./shadowBlut";
import squircle from "./squircle";
import Widget from "./widget";

const wallpaper = await loadTexture("/Wallpaper/Gold/Flat/image.jpg");

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
	shouldDraw = false;
	Shader.clear(Shader.screen);
	Shader.clear(Shader.bs);

	//wallpaper
	none(Shader.fullscreen, wallpaper, Shader.screen, true);
	
	
	// bar
	none([-128, Shader.canvas.height - 128, Shader.fullscreen[2] + 256, 256], Shader.screen, Shader.bs);
	shadowBlur([-128, Shader.canvas.height - 128, Shader.fullscreen[2] + 256, 256], 128, 1, 32, 0, Shader.bs, Shader.screen);
	shadowBlur([-128, Shader.canvas.height - 128, Shader.fullscreen[2] + 256, 256], 128, 1, 32, Math.PI / 3, Shader.screen, Shader.bs);
	shadowBlur([-128, Shader.canvas.height - 128, Shader.fullscreen[2] + 256, 256], 128, 1, 32, Math.PI * 2 / 3, Shader.bs, Shader.screen);
	
	// window
	widget.draw();
	glass([500, 300, 200, 200], 100, 2);
	
	// bar
	drawBar(0);

	// dock
	drawDock();

	// mouse
	glass([Pointer.position[0] - 24, Pointer.position[1] - 24, 48, 48], 24, 2, mix(glassAlbedo, black, 0.5), glassEmission);
	glass([Pointer.position[0] - 16, Pointer.position[1] - 16, 32, 32], 16, 2, glassAlbedo, mix(white, glassEmission, 0.5));
	
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
