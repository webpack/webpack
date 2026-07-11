"use strict";

// Deno runs an eval worker as a classic script (no `require`) and treats a `.js`
// worker entry as ESM, so the harness's CJS worker bootstrap (createFakeWorker)
// and webpack's emitted CJS `.js` worker entries fail to load under Deno. Route
// both through a temporary `.cjs` file — the eval body, or a one-line `require`
// of the real entry — which Deno runs as CommonJS. This avoids the
// --unstable-detect-cjs flag. No-op on Node/Bun (gated on process.versions.deno).
if (process.versions.deno) {
	const fs = require("node:fs");
	const os = require("node:os");
	const path = require("node:path");
	const { fileURLToPath } = require("node:url");
	const workerThreads = require("node:worker_threads");

	const RealWorker = workerThreads.Worker;

	let seq = 0;
	const tempCjs = () =>
		path.join(os.tmpdir(), `webpack-deno-worker-${process.pid}-${seq++}.cjs`);
	const toPath = (resource) => {
		if (resource instanceof URL) return fileURLToPath(resource);
		if (typeof resource !== "string") return undefined;
		return resource.startsWith("file:") ? fileURLToPath(resource) : resource;
	};

	workerThreads.Worker = class DenoWorker extends RealWorker {
		/**
		 * @param {string | URL} resource worker resource
		 * @param {EXPECTED_ANY} options worker options
		 */
		constructor(resource, options = {}) {
			let temp;
			if (options && options.eval) {
				// eval body -> .cjs file so Deno runs it as CommonJS
				temp = tempCjs();
				fs.writeFileSync(temp, String(resource));
				super(temp, { ...options, eval: false });
			} else if (!options || options.type !== "module") {
				const file = toPath(resource);
				if (file && /\.js$/.test(file)) {
					// CJS `.js` entry -> require it from a .cjs stub; the entry keeps its
					// own dir as __dirname, so its relative chunk loads still resolve.
					temp = tempCjs();
					fs.writeFileSync(temp, `require(${JSON.stringify(file)});\n`);
					super(temp, options);
				} else {
					super(resource, options);
				}
			} else {
				super(resource, options);
			}
			if (temp) {
				const file = temp;
				this.once("exit", () => {
					try {
						fs.unlinkSync(file);
					} catch {
						// best-effort cleanup
					}
				});
			}
		}
	};
}
