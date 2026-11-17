/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { fileURLToPath } = require("url");
const { NormalModule } = require("..");
const { relative } = require("../fs/fs");
const { cachedSetProperty } = require("../util/cleverMerge");
const { isOutsideDirectory } = require("../util/identifier");

/** @import Compiler from "../Compiler" */
/** @import { InputFileSystem } from "../fs/fs" */

const PLUGIN_NAME = "FileUriPlugin";

class FileUriPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("file")
					.tapAsync(PLUGIN_NAME, (resourceData, resolveData, callback) => {
						const url = new URL(resourceData.resource);
						const path = fileURLToPath(url);
						// the path is not resolved, so `resolve.restrictions` is checked here
						const { resolveOptions, dependencyType } = resolveData;
						const resolver = normalModuleFactory.getResolver(
							"normal",
							dependencyType
								? cachedSetProperty(
										resolveOptions || {},
										"dependencyType",
										dependencyType
									)
								: resolveOptions
						);
						for (const restriction of resolver.options.restrictions) {
							if (
								typeof restriction === "string"
									? isOutsideDirectory(
											relative(
												/** @type {InputFileSystem} */
												(compiler.inputFileSystem),
												restriction,
												path
											)
										)
									: !restriction.test(path)
							) {
								return callback(
									new Error(
										`Can't resolve '${resourceData.resource}': ${path} is not inside of the restriction ${restriction}`
									)
								);
							}
						}
						const query = url.search;
						const fragment = url.hash;
						resourceData.path = path;
						resourceData.query = query;
						resourceData.fragment = fragment;
						resourceData.resource = path + query + fragment;
						callback(null, true);
					});
				const hooks = NormalModule.getCompilationHooks(compilation);
				hooks.readResource
					.for(undefined)
					.tapAsync(PLUGIN_NAME, (loaderContext, callback) => {
						const { resourcePath } = loaderContext;
						loaderContext.fs.readFile(resourcePath, (err, result) => {
							if (err) return callback(err);
							loaderContext.addDependency(resourcePath);
							callback(null, result);
						});
					});
			}
		);
	}
}

module.exports = FileUriPlugin;
