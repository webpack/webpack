"use strict";

/** @typedef {import("../../").Configuration} Configuration */
/** @typedef {Configuration | Configuration[]} Config */
/** @typedef {{ testPath?: string, srcPath?: string, env?: Record<string, unknown> }} Argv */
/** @typedef {(env: Record<string, unknown> | undefined, argv: Argv) => Config | Promise<Config>} ConfigFn */
/** @typedef {Config | ConfigFn | ConfigFn[]} ConfigOrFn */
/** @typedef {ConfigOrFn | Promise<ConfigOrFn> | { default: ConfigOrFn | Promise<ConfigOrFn> }} ConfigModule */

/**
 * @param {unknown} value value
 * @returns {value is Promise<EXPECTED_ANY>} true when thenable
 */
const isPromise = (value) =>
	Boolean(value) &&
	typeof (/** @type {Promise<EXPECTED_ANY>} */ (value).then) === "function";

/**
 * @param {ConfigModule} options exported config value
 * @returns {ConfigOrFn | Promise<ConfigOrFn>} unwrapped config value
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
	return /** @type {ConfigOrFn | Promise<ConfigOrFn>} */ (options);
};

/**
 * @param {Configuration | ConfigFn} options config or config factory
 * @param {Argv} argv argv
 * @returns {Config | Promise<Config>} config
 */
const handleFunction = (options, argv) =>
	typeof options === "function" ? options(argv.env, argv) : options;

/**
 * Stays synchronous for synchronous configs so callers that don't await keep working.
 * @param {ConfigModule} options exported config value
 * @param {Argv=} argv argv
 * @returns {Config | Promise<Config>} config
 */
const prepareOptions = (options, argv = {}) => {
	const unwrapped = handleExport(options);

	if (isPromise(unwrapped)) {
		return unwrapped.then((options) => prepareOptions(options, argv));
	}

	if (Array.isArray(unwrapped)) {
		const items = unwrapped.map((_options) => handleFunction(_options, argv));
		return items.some((item) => isPromise(item))
			? Promise.all(/** @type {Promise<Configuration>[]} */ (items))
			: /** @type {Configuration[]} */ (items);
	}

	return handleFunction(unwrapped, argv);
};

module.exports = prepareOptions;
