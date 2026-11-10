"use strict";

const assert = require("assert");
const path = require("path");

/** @type {import("../../../../types").Configuration[]} */
module.exports = [false, true].map((unsafeCache) => ({
	module: { unsafeCache, rules: [{ test: /\.js$/, sideEffects: false }] },
	optimization: { providedExports: true },
	plugins: [
		(compiler) => {
			compiler.hooks.finishMake.tapAsync(
				"testcase",
				(compilation, callback) => {
					const resource = path.join(compiler.context, "barrel.js");
					const module = [...compilation.modules].find(
						(module) => module.nameForCondition() === resource
					);
					assert(module, "Barrel module was not built");
					compilation.rebuildModule(module, (error) => callback(error));
				}
			);
		}
	]
}));
