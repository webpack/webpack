"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	module: {
		unsafeCache: false,
		rules: [{ test: /(?:barrel|first|second)\.js$/, sideEffects: false }]
	},
	plugins: [
		(compiler) => {
			const metadata = path.join(compiler.context, "metadata");
			compiler.hooks.normalModuleFactory.tap(
				"CheckResolveDependencies",
				(factory) => {
					factory.hooks.beforeResolve.tap(
						"CheckResolveDependencies",
						(data) => {
							if (data.request === "./first.js") {
								data.contextDependencies.add(metadata);
							}
						}
					);
				}
			);
			compiler.hooks.afterCompile.tap(
				"CheckResolveDependencies",
				(compilation) => {
					expect(compilation.contextDependencies.has(metadata)).toBe(true);
				}
			);
		}
	]
};
