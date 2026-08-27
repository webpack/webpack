"use strict";

const path = require("path");

// A `managedPaths` RegExp is documented as matching the managed directory
// itself, so one without a capture group names it with the whole match.
const managedPath = new RegExp(
	`^${path
		.resolve(__dirname, "node_modules")
		.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}[\\\\/]`
);

/** @type {import("../../../../").Configuration} */
module.exports = {
	snapshot: {
		managedPaths: [managedPath]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", ({ compilation }) => {
				const fileDeps = [...compilation.fileDependencies];
				expect(fileDeps).toContain(
					path.resolve(__dirname, "node_modules/package/index.js")
				);
				expect(fileDeps).toContain(path.resolve(__dirname, "index.js"));
			});
		}
	],
	module: {
		unsafeCache: false
	}
};
