"use strict";

const path = require("path");
const { Worker } = require("worker_threads");

const fixtures = [
	"module-sync-only",
	"module-sync-first",
	"import-require-first"
];

// Resolve each fixture via real Node.js's require() and import() in a worker
// thread. Workers run in a fresh Node.js context that bypasses Jest's runtime
// patches (Jest's CJS resolver omits the "module-sync" condition, so an
// in-process Module.createRequire would not match real Node.js behavior).
// Async messaging is used because dynamic import() in a worker deadlocks if
// the main thread is parked on Atomics.wait.
const nodeResultsPromise = new Promise((resolve, reject) => {
	const worker = new Worker(path.join(__dirname, "node-resolve.worker.mjs"), {
		workerData: {
			fixture: path.join(__dirname, "index.js"),
			fixtures
		}
	});
	worker.on("message", (msg) => {
		worker.terminate();
		resolve(msg);
	});
	worker.on("error", reject);
});

module.exports = {
	findBundle(_, options) {
		const ext = path.extname(options.output.filename);
		return `./bundle${ext}`;
	},
	moduleScope(scope) {
		scope.nodeRequire = async (name) =>
			(await nodeResultsPromise).require[name];
		scope.nodeImport = async (name) => ({
			default: (await nodeResultsPromise).import[name]
		});
	}
};
