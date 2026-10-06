"use strict";

const { DefinePlugin } = require("../../../../");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const step = () => Number(currentWatchStep.step);

const keyB = `${DefinePlugin.VALUE_DEP_PREFIX}process.env.B`;
// Both steps' versions concatenate to the same "key=value|…" text.
const steps = [
	{ suffix: "1", versionA: `1|${keyB}=2`, versionB: "3" },
	{ suffix: "2", versionA: "1", versionB: `2|${keyB}=3` }
];

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: { minimize: false },
	plugins: [
		(compiler) => {
			const { suffix, versionA, versionB } = steps[step()];
			new DefinePlugin({
				"process.env.A": DefinePlugin.runtimeValue(
					() => JSON.stringify(`a${suffix}`),
					{ version: versionA }
				),
				"process.env.B": DefinePlugin.runtimeValue(
					() => JSON.stringify(`b${suffix}`),
					{ version: versionB }
				)
			}).apply(compiler);
		}
	]
};
