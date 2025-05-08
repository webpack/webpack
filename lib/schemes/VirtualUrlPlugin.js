/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { NormalModule } = require("..");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../NormalModule")} NormalModule */

/**
 * @template T
 * @typedef {import("../../declarations/LoaderContext").LoaderContext<T>} LoaderContext
 */

const PLUGIN_NAME = "VirtualUrlPlugin";
const DEFAULT_SCHEME = "virtual";

/**
 * @typedef {object} VirtualUrlPluginOptions
 * @property {(resourcePath: string, loaderContext: LoaderContext<EXPECTED_ANY>) => Promise<string> | string} source - The source function that provides the virtual content
 * @property {string=} scheme - The URL scheme to use
 */

class VirtualUrlPlugin {
	/**
	 * @param {VirtualUrlPluginOptions} options The plugin options
	 */
	constructor({ source, scheme }) {
		this.source = source;
		this.scheme = scheme || DEFAULT_SCHEME;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const scheme = this.scheme;

		compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
			const hooks = NormalModule.getCompilationHooks(compilation);
			hooks.readResource
				.for(scheme)
				.tapAsync(PLUGIN_NAME, async (loaderContext, callback) => {
					const { resourcePath } = loaderContext;
					try {
						const source = await this.source(resourcePath, loaderContext);
						callback(null, source);
					} catch (err) {
						callback(/** @type {Error} */ (err));
					}
				});
		});
	}
}

VirtualUrlPlugin.DEFAULT_SCHEME = DEFAULT_SCHEME;

module.exports = VirtualUrlPlugin;
