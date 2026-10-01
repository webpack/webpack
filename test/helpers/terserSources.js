"use strict";

// cspell:ignore jridgewell

/**
 * terser's own modules, which its published entry point does not expose: the
 * reference the printer's tests compare webpack's ports with.
 * @param {(specifier: string) => Promise<EXPECTED_ANY>} importModule the calling test's own `import()`, bound to its runtime
 * @returns {Promise<Record<string, EXPECTED_ANY>>} the modules, by what they hold
 */
const loadTerserSources = async (importModule) => {
	const path = require("path");
	const { pathToFileURL } = require("url");
	const { createRequire } = require("module");

	const directory = path.dirname(require.resolve("terser/package.json"));
	/**
	 * @param {string} file a file in terser's `lib`
	 * @returns {Promise<EXPECTED_ANY>} the module
	 */
	const at = (file) =>
		importModule(pathToFileURL(path.join(directory, "lib", file)).href);
	// One at a time: asking for several at once leaves a module loader linking a
	// module that another import is still reading.
	const ast = await at("ast.js");
	// Read for its effect: it installs `transform` on every node class.
	await at("transform.js");
	const scope = await at("scope.js");
	const parse = await at("parse.js");
	const output = await at("output.js");
	const utils = await at("utils/index.js");
	// Read for its effect: it installs the ESTree conversions.
	await at("mozilla-ast.js");
	const { minify } = await at("minify.js");
	const compress = await at("compress/index.js");
	const domprops = await at("../tools/domprops.js");
	const common = await at("compress/common.js");
	const inference = await at("compress/inference.js");
	const flags = await at("compress/compressor-flags.js");
	const nativeObjects = await at("compress/native-objects.js");
	const sourceMap = createRequire(path.join(directory, "package.json"))(
		"@jridgewell/source-map"
	);
	return {
		ast,
		scope,
		parse,
		output,
		utils,
		minify,
		compress,
		domprops,
		common,
		inference,
		flags,
		nativeObjects,
		sourceMap,
		version: require("terser/package.json").version
	};
};

module.exports = { loadTerserSources };
