"use strict";

const fs = require("fs");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @returns {import("webpack").Configuration[]} configurations */
module.exports = () =>
	[false, true].map((virtualEntry, index) => {
		/** @type {Map<string, number>} */
		const reads = new Map();
		/**
		 * @param {string} name module name
		 * @param {string} source module source
		 * @returns {string} counted source
		 */
		const read = (name, source) => {
			reads.set(name, (reads.get(name) || 0) + 1);
			return source;
		};
		return {
			mode: "development",
			cache: { type: "memory" },
			entry: virtualEntry ? "virtual:entry" : "./index.js",
			output: { filename: `bundle${index}.js`, clean: false },
			plugins: [
				(compiler) => {
					new compiler.webpack.experiments.schemes.VirtualUrlPlugin({
						entry: {
							version: "stable",
							source: () =>
								read(
									"entry",
									fs.readFileSync(
										path.join(compiler.context, "index.js"),
										"utf8"
									)
								)
						},
						stable: {
							version: "stable",
							source: () => read("stable", 'export const value = "stable";')
						},
						changing: {
							version: () =>
								Number(currentWatchStep.step) < 2 ? "first" : "second",
							source: async () =>
								read(
									"changing",
									`export const value = ${JSON.stringify(
										Number(currentWatchStep.step) < 2 ? "first" : "second"
									)};`
								)
						},
						unversioned: {
							source: () =>
								read("unversioned", 'export const value = "unversioned";')
						},
						always: {
							version: true,
							source: () =>
								read(
									"always",
									`export const value = ${JSON.stringify(
										currentWatchStep.step
									)};`
								)
						}
					}).apply(compiler);
					let compilations = 0;
					compiler.hooks.afterCompile.tap("CachedVirtualVersion", () => {
						if (!compiler.watchMode) return;
						compilations++;
						expect(reads.get("entry")).toBe(virtualEntry ? 1 : undefined);
						expect(reads.get("stable")).toBe(1);
						expect(reads.get("changing")).toBe(
							Number(currentWatchStep.step) < 2 ? 1 : 2
						);
						expect(reads.get("unversioned")).toBe(1);
						expect(reads.get("always")).toBe(compilations);
					});
				}
			]
		};
	});
