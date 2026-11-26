"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, FileCacheOptions } from "../../../../" */

const step = () => Number(currentWatchStep.step);

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: { minimize: false },
	plugins: [
		(compiler) => {
			// Applied before the cache and resolver read these options
			const target = ["a", "b", "a"][step()];
			if (compiler.options.cache) {
				/** @type {FileCacheOptions} */ (compiler.options.cache).version =
					`alias-${target}`;
			}
			compiler.options.resolve.alias = {
				"my-alias": path.resolve(compiler.context, `target-${target}.js`)
			};
		}
	]
};
