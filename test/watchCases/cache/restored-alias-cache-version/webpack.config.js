"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const step = () => Number(currentWatchStep.step);

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: { minimize: false },
	plugins: [
		(compiler) => {
			// Applied before the cache and resolver read these options
			const target = ["a", "b", "a"][step()];
			compiler.options.cache.version = `alias-${target}`;
			compiler.options.resolve.alias = {
				"my-alias": path.resolve(compiler.context, `target-${target}.js`)
			};
		}
	]
};
