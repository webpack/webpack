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
						/** @type {URL} */
						let url;
						/** @type {string} */
						let path;
						try {
							url = new URL(resourceData.resource);
							path = fileURLToPath(url);
						} catch (err) {
							return callback(/** @type {Error} */ (err));
						}
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
						const { restrictions, symlinks } = resolver.options;
						const fs = /** @type {InputFileSystem} */ (
							compiler.inputFileSystem
						);
						/**
						 * Checks the file against the restrictions and uses it as the resource.
						 * @param {string} file the path to check and read
						 * @returns {void}
						 */
						const useFile = (file) => {
							for (const restriction of restrictions) {
								if (
									typeof restriction === "string"
										? isOutsideDirectory(relative(fs, restriction, file))
										: !restriction.test(file)
								) {
									return callback(
										new Error(
											`Can't resolve '${resourceData.resource}': ${file} is not inside of the restriction ${restriction}`
										)
									);
								}
							}
							const query = url.search;
							const fragment = url.hash;
							resourceData.path = file;
							resourceData.query = query;
							resourceData.fragment = fragment;
							resourceData.resource = file + query + fragment;
							callback(null, true);
						};
						// as the resolver does, a link is checked and read at its target
						if (restrictions.size === 0 || !symlinks || !fs.realpath) {
							return useFile(path);
						}
						fs.realpath(path, (err, realPath) => {
							useFile(err || !realPath ? path : String(realPath));
						});
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
