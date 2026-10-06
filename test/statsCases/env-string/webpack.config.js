"use strict";

/** @typedef {import("../../../").StatsOptions & { _env?: unknown }} StatsOptionsWithEnv */

/**
 * Sets `_env`, the CLI's `--env` value, once the options are validated, as the
 * schema rejects it.
 * @param {unknown} env value of `--env`
 * @returns {import("../../../").WebpackPluginFunction} plugin
 */
const setEnv = (env) => (compiler) => {
	/** @type {StatsOptionsWithEnv} */ (compiler.options.stats)._env = env;
};

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		name: "string",
		mode: "production",
		entry: "./index",
		output: { filename: "string.js" },
		stats: { all: false, env: true },
		plugins: [setEnv("production")]
	},
	{
		name: "object",
		mode: "production",
		entry: "./index",
		output: { filename: "object.js" },
		stats: { all: false, env: true },
		plugins: [setEnv({ prod: ["foo", "bar"], baz: true })]
	}
];
