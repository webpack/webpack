/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { fileURLToPath } = require("url");
const { NormalModule } = require("..");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "FileUriPlugin";

class FileUriPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("file")
					.tap(PLUGIN_NAME, (resourceData) => {
						const url = new URL(resourceData.resource);
						const path = fileURLToPath(url);
						const query = url.search;
						const fragment = url.hash;
						resourceData.path = path;
						resourceData.query = query;
						resourceData.fragment = fragment;
						resourceData.resource = path + query + fragment;
						return true;
					});
				const hooks = NormalModule.getCompilationHooks(compilation);

				/**
				 * @param {string} resourcePath the resource path
				 * @param {(err: Error | null, result?: Buffer<ArrayBufferLike>) => void} callback the callback
				 */
				const readResource = (resourcePath, callback) => {
					compilation.inputFileSystem.readFile(resourcePath, callback);
				};
				hooks.readResource
					.for(undefined)
					.tapAsync(PLUGIN_NAME, (loaderContext, callback) => {
						const { resourcePath } = loaderContext;
						loaderContext.addDependency(resourcePath);
						readResource(resourcePath, callback);
					});
				hooks.readResourceFromURL
					.for(undefined)
					.tapAsync(PLUGIN_NAME, (resourcePath, callback) => {
						readResource(resourcePath, callback);
					});
			}
		);
	}
}

module.exports = FileUriPlugin;
