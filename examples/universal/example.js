// One source file, one ESM bundle, every runtime. `target: "universal"` tells
// webpack to emit only the runtime features that browser, web worker, Node.js,
// Electron and NW.js all share, so this entry runs as-is on each one.
import { platform } from "./env";

const banner = `Hello from webpack — running on: ${platform()}`;

async function main() {
	// Code-split into its own chunk. The universal chunk loader knows how to
	// fetch it on either platform (native `import()` in the browser, dynamic
	// `import()` of the emitted `.mjs` in Node).
	const { render } = await import("./render");

	render(banner);
}

main();
