"use strict";

const currentWatchStep = /** @type {{ step: string | undefined }} */ (
	require("../../../helpers/currentWatchStep")
);

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		(compiler) => {
			/** @type {string[]} */
			let requests = [];
			/** @type {string | undefined} */
			let lastHash;
			compiler.hooks.normalModuleFactory.tap(
				"CheckIncrementalWork",
				(factory) => {
					requests = [];
					factory.hooks.beforeResolve.tap("CheckIncrementalWork", (data) => {
						requests.push(data.request);
					});
				}
			);
			compiler.hooks.afterCompile.tap("CheckIncrementalWork", (compilation) => {
				if (!compiler.watchMode || compilation.hash === lastHash) return;
				lastHash = compilation.hash;
				expect(requests.sort()).toEqual(
					[
						["./changing", "./index.js", "./stable"],
						["./changing"],
						["./added", "./changing"]
					][Number(currentWatchStep.step)]
				);
			});
		}
	]
};
