"use strict";

const fs = require("fs");
const path = require("path");

/** @type {string[]} */
const allModules = fs
	.readdirSync(__dirname, { recursive: true })
	.filter((rel) => typeof rel === "string")
	.map((rel) => path.resolve(__dirname, rel))
	.filter((file) => {
		const name = path.basename(file);
		return (
			fs.statSync(file).isFile() &&
			name !== "package.json" &&
			name !== "webpack.config.js" &&
			name !== "test.filter.js" &&
			name !== "test.config.js"
		);
	});

// re-export targets that must stay deferred; `named-barrel/d.js` is a locally
// imported binding re-exported unused, which webpack keeps lazy too
const lazyModules = new Set(
	[
		"named-barrel/b.js",
		"named-barrel/d.js",
		"mixed-barrel/a.js",
		"mixed-barrel/b.js",
		"star-barrel/c.js",
		"nested-barrel/c.js",
		"ns-barrel/other.js",
		"shared-barrel/d.js"
	].map((file) => path.resolve(__dirname, file))
);

/** @type {(variant: boolean) => import("../../../../").Configuration} */
const config = (variant) => ({
	optimization: {
		inlineExports: variant,
		providedExports: variant,
		concatenateModules: variant
	},
	plugins: [
		(compiler) => {
			const created = new Set();
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.buildModule.tap("Test", (module) => {
					created.add(module.resource);
				});
			});
			compiler.hooks.done.tap("Test", () => {
				for (const module of lazyModules) {
					expect(created.has(module)).toBe(false);
				}
				expect(
					allModules.filter(
						(module) => !created.has(module) && !lazyModules.has(module)
					)
				).toEqual([]);
			});
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(false), config(true)];
