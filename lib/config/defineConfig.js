/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

/** @typedef {import("../../declarations/WebpackOptions.js").WebpackOptions} Configuration */
/** @typedef {import("../MultiCompiler.js").MultiWebpackOptions} MultiConfiguration */

/**
 * @template T
 * @typedef {T | Promise<T>} MaybePromise
 */

/**
 * Function style configuration, called with the `--env` values and CLI arguments.
 * @typedef {(env: Record<string, EXPECTED_ANY>, argv: Record<string, EXPECTED_ANY>) => MaybePromise<Configuration | MultiConfiguration>} ConfigurationFactory
 */

/** @typedef {MaybePromise<Configuration | MultiConfiguration | ConfigurationFactory | ConfigurationFactory[]>} DefineConfigInput */

/**
 * A type helper for authoring configuration files, no-op at runtime.
 * @template {DefineConfigInput} T
 * @param {T} config webpack configuration
 * @returns {T} the same configuration
 */
const defineConfig = (config) => config;

export default defineConfig;

export { defineConfig as "module.exports" };
