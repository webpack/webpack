"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	[false, false],
	[false, true],
	[true, false],
	[true, true],
	[true, true, true]
].map(([module, modern, universal]) => ({
	target: universal ? ["web", "node"] : "web",
	output: {
		module,
		publicPath: "/assets/",
		environment: { spread: modern, arrowFunction: modern }
	},
	optimization: { minimize: false },
	module: {
		parser: {
			javascript: { worker: ["...", "CustomWorker", "workers.SharedWorker"] }
		}
	}
}));
