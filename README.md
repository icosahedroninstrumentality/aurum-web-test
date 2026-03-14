# aurum-web-test

This is a simple demo project of Our Liquid Glass demo. This is a portable glsl shader that can be embedded in basically any WebGL or OpenGL project.

Currently the only shape supported is a parametric superellipse that We searched the formula for, it is directly shown in the `calculateInside` function of the glass shader.

This demo shows a simple "Liquid Glass desktop" scene which is real time rendered. This project was developed on a laptop with an i7-13700H and the only iGPU present in that CPU (an Intel Xe iGPU) and was able to make this scene run at 90FPS consistently for long periods of time (>1h). Here's a screenshot of what it looks like:

![alt text](./public/demo-i7.png)

Here's a demo of the same shader code running on a Motorola Moto E32s at vsync without visible stutter (the video capture is a bit choppy on this hardware, keep in mind):

<video controls width="300">
  <source src="./public/demo-e32s.mp4" type="video/mp4">
</video>

<a href="./public/demo-e32s.mp4">Direct link in case the video does not render</a>

---

<p style="text-align: center;"><center>
Made by Ico with ❤️ | <a href="./LICENSE">ISC License</a>
</center></p>