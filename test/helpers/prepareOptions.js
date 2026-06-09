"use strict";

/** @typedef {import("../../").Configuration} Configuration */
/** @typedef {Configuration | Configuration[]} Config */
/** @typedef {{ testPath?: string, srcPath?: string, env?: Record<string, unknown> }} Argv */
/** @typedef {(env: Record<string, unknown> | undefined, argv: Argv) => Config} ConfigFn */
/** @typedef {Config | ConfigFn} ConfigOrFn */
/** @typedef {ConfigOrFn | { default: ConfigOrFn }} ConfigModule */

/**
 * @param {ConfigModule} options exported config value
 * @returns {ConfigOrFn} unwrapped config value
 */
const handleExport = (options) => {
	if (
		typeof options === "object" &&
		options !== null &&
		"default" in options &&
		options.default !== undefined
	) {
		return options.default;
	}
	return /** @type {ConfigOrFn} */ (options);
};

/**
 * @param {ConfigOrFn} options config or config factory
 * @param {Argv} argv argv
 * @returns {Config} config
 */
const handleFunction = (options, argv) =>
	typeof options === "function" ? options(argv.env, argv) : options;

/**
 * @param {ConfigModule} options exported config value
 * @param {Argv=} argv argv
 * @returns {Config} config
 */
module.exports = (options, argv = {}) => {
	const unwrapped = handleExport(options);

	if (Array.isArray(unwrapped)) {
		return /** @type {Configuration[]} */ (
			unwrapped.map((_options) => handleFunction(_options, argv))
		);
	}

	return handleFunction(unwrapped, argv);
};
