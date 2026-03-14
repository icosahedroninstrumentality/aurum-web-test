import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3701,
		allowedHosts: true,
		host: true,
	},
});