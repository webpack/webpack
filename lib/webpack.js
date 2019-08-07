/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateSchema = require("schema-utils");
const webpackOptionsSchema = require("../schemas/WebpackOptions.json");
const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");
const WebpackOptionsApply = require("./WebpackOptionsApply");
const WebpackOptionsDefaulter = require("./WebpackOptionsDefaulter");
const NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin");

/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */
/** @typedef {import("./MultiStats")} MultiStats */
/** @typedef {import("./Stats")} Stats */

/**
 * @template T
 * @callback Callback
 * @param {Error=} err
 * @param {T=} stats
 * @returns {void}
 */

/**
 * @param {WebpackOptions[]} childOptions options array
 * @returns {MultiCompiler} a multi-compiler
 */
const createMultiCompiler = childOptions => {
	const compilers = childOptions.map(options => createCompiler(options));
	const compiler = new MultiCompiler(compilers);
	for (const childCompiler of compilers) {
		if (childCompiler.options.dependencies) {
			compiler.setDependencies(
				childCompiler,
				childCompiler.options.dependencies
			);
		}
	}
	return compiler;
};

/**
 * @param {WebpackOptions} options options object
 * @returns {Compiler} a compiler
 */
const createCompiler = options => {
	options = new WebpackOptionsDefaulter().process(options);
	const compiler = new Compiler(options.context);
	compiler.options = options;
	new NodeEnvironmentPlugin({
		infrastructureLogging: options.infrastructureLogging
	}).apply(compiler);
	if (Array.isArray(options.plugins)) {
		for (const plugin of options.plugins) {
			if (typeof plugin === "function") {
				plugin.call(compiler, compiler);
			} else {
				plugin.apply(compiler);
			}
		}
	}
	compiler.hooks.environment.call();
	compiler.hooks.afterEnvironment.call();
	compiler.options = new WebpackOptionsApply().process(options, compiler);
	return compiler;
};

/**
 * @param {WebpackOptions | WebpackOptions[]} options options object
 * @param {Callback<Stats | MultiStats>=} callback callback
 * @returns {Compiler | MultiCompiler} the compiler object
 */
const webpack = (options, callback) => {
	validateSchema(webpackOptionsSchema, options, {
		name: "Webpack",
		postFormatter: (formattedError, error) => {
			if (
				error.children &&
				error.children.some(
					child =>
						child.keyword === "absolutePath" &&
						child.dataPath === ".output.filename"
				)
			) {
				return `${formattedError}\nPlease use output.path to specify absolute path and output.filename for the file name.`;
			}

			if (error.keyword === "additionalProperties" && !error.dataPath) {
				if (error.params.additionalProperty === "debug") {
					return (
						`${formattedError}\n` +
						"The 'debug' property was removed in webpack 2.0.0.\n" +
						"Loaders should be updated to allow passing this option via loader options in module.rules.\n" +
						"Until loaders are updated one can use the LoaderOptionsPlugin to switch loaders into debug mode:\n" +
						"plugins: [\n" +
						"  new webpack.LoaderOptionsPlugin({\n" +
						"    debug: true\n" +
						"  })\n" +
						"]"
					);
				}

				if (error.params.additionalProperty) {
					return (
						`${formattedError}\n` +
						"For typos: please correct them.\n" +
						"For loader options: webpack >= v2.0.0 no longer allows custom properties in configuration.\n" +
						"  Loaders should be updated to allow passing options via loader options in module.rules.\n" +
						"  Until loaders are updated one can use the LoaderOptionsPlugin to pass these options to the loader:\n" +
						"  plugins: [\n" +
						"    new webpack.LoaderOptionsPlugin({\n" +
						"      // test: /\\.xxx$/, // may apply this only for some modules\n" +
						"      options: {\n" +
						`        ${error.params.additionalProperty}: …\n` +
						"      }\n" +
						"    })\n" +
						"  ]"
					);
				}
			}

			return formattedError;
		}
	});
	/** @type {TODO} */
	let compiler;
	let watch = false;
	let watchOptions;
	if (Array.isArray(options)) {
		compiler = createMultiCompiler(options);
		watch = options.some(options => options.watch);
		watchOptions = options.map(options => options.watchOptions || {});
	} else {
		compiler = createCompiler(options);
		watch = options.watch;
		watchOptions = options.watchOptions || {};
	}
	if (callback) {
		if (watch) {
			compiler.watch(watchOptions, callback);
		} else {
			compiler.run((err, stats) => {
				compiler.close(err2 => {
					callback(err || err2, stats);
				});
			});
		}
	}
	return compiler;
};

module.exports = webpack;
