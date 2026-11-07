/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { getScheme } = require("../util/URLAbsoluteSpecifier");
const memoize = require("../util/memoize");
const { runLoaders } = require("./LoaderRunner");

/** @import NormalModule, { AnyLoaderContext, LoaderJobArgs } from "../module/NormalModule" */
/** @import { LoaderResultArgs } from "./LoaderRunner" */

const getExtractSourceMap = memoize(() =>
	require("../module/extractSourceMap")
);
const getUnhandledSchemeError = memoize(() =>
	require("../errors/UnhandledSchemeError")
);
const getModuleWarning = memoize(() => require("../errors/ModuleWarning"));

/**
 * @typedef {(resourcePath: string, getLoaderContext: (resourcePath: string) => AnyLoaderContext) => Promise<string | Buffer<ArrayBufferLike>>} ReadResource
 */

/**
 * Runs a module's loader chain on the main thread.
 * @param {NormalModule} module the module being built
 * @param {LoaderJobArgs} args the context `_doBuild` holds
 * @returns {boolean} always true; the chain always runs here
 */
const runLoaderJobLocally = (module, args) => {
	const { hooks, loaderContext, finishLoaders } = args;

	runLoaders(
		{
			resource: module.resource,
			// A resource with a scheme (`data:`, `virtual:`) has no directory of
			// its own; the factory gave the module one to resolve from.
			resourceContext:
				getScheme(module.resource) && module.context
					? module.context
					: undefined,
			loaders: module.loaders,
			context: loaderContext,
			/**
			 * @param {AnyLoaderContext} loaderContext the loader context
			 * @param {string} resourcePath the resource Path
			 * @param {(err: Error | null, ...args: LoaderResultArgs) => void} callback callback
			 * @returns {Promise<void>}
			 */
			processResource: async (loaderContext, resourcePath, callback) => {
				/** @type {ReadResource} */
				const readResource = (resourcePath, getLoaderContext) => {
					const scheme = getScheme(resourcePath);
					return new Promise((resolve, reject) => {
						hooks.readResource
							.for(scheme)
							.callAsync(getLoaderContext(resourcePath), (err, result) => {
								if (err) {
									reject(err);
								} else {
									if (typeof result !== "string" && !result) {
										return reject(
											new (getUnhandledSchemeError())(
												/** @type {string} */
												(scheme),
												resourcePath
											)
										);
									}
									resolve(result);
								}
							});
					});
				};
				try {
					const result = await readResource(resourcePath, () => loaderContext);
					if (
						module.extractSourceMap &&
						!module.useSourceMap &&
						!module.useSimpleSourceMap
					) {
						return callback(
							null,
							getExtractSourceMap().removeSourceMappingURL(result)
						);
					}
					if (module.extractSourceMap) {
						try {
							const { source, sourceMap } = await getExtractSourceMap()(
								result,
								resourcePath,
								/** @type {ReadResource} */
								(resourcePath) =>
									readResource(
										resourcePath,
										(resourcePath) =>
											/** @type {AnyLoaderContext} */
											({
												addDependency(dependency) {
													loaderContext.addDependency(dependency);
												},
												fs: loaderContext.fs,
												_module: undefined,
												resourcePath,
												resource: resourcePath
											})
									).catch((/** @type {Error} */ err) => {
										throw new Error(
											`Failed to parse source map. ${err.message}`
										);
									})
							);
							return callback(null, source, sourceMap);
						} catch (err) {
							module.addWarning(
								new (getModuleWarning())(/** @type {Error} */ (err))
							);
							return callback(null, result);
						}
					}
					return callback(null, result);
				} catch (error) {
					return callback(/** @type {Error} */ (error));
				}
			}
		},
		finishLoaders
	);
	return true;
};

module.exports = runLoaderJobLocally;
