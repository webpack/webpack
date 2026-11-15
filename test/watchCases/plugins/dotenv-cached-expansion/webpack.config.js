"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	devtool: false,
	dotenv: {
		dir: srcPath,
		template: [".env"]
	},
	plugins: [
		(compiler) => {
			const original = process.env.WEBPACK_DOTENV_CACHE_BASE;
			compiler.hooks.watchRun.tap("DotenvCachedExpansion", () => {
				const step = Number(currentWatchStep.step);
				if (step < 2) {
					process.env.WEBPACK_DOTENV_CACHE_BASE = ["first", "second"][step];
				} else {
					delete process.env.WEBPACK_DOTENV_CACHE_BASE;
				}
			});
			compiler.hooks.watchClose.tap("DotenvCachedExpansion", () => {
				if (original === undefined) {
					delete process.env.WEBPACK_DOTENV_CACHE_BASE;
				} else {
					process.env.WEBPACK_DOTENV_CACHE_BASE = original;
				}
			});
		}
	]
});
