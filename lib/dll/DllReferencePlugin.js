/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import ExternalModuleFactoryPlugin from "../ExternalModuleFactoryPlugin.js";
import DelegatedSourceDependency from "../dependencies/DelegatedSourceDependency.js";
import WebpackError from "../errors/WebpackError.js";
import { makePathsRelative } from "../util/identifier.js";
import parseJson from "../util/parseJson.js";
import DelegatedModuleFactoryPlugin from "./DelegatedModuleFactoryPlugin.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../../declarations/WebpackOptions.js").Externals} Externals */
/** @typedef {import("../../declarations/plugins/dll/DllReferencePlugin.js").DllReferencePluginOptions} DllReferencePluginOptions */
/** @typedef {import("../../declarations/plugins/dll/DllReferencePlugin.js").DllReferencePluginOptionsContent} DllReferencePluginOptionsContent */
/** @typedef {import("../../declarations/plugins/dll/DllReferencePlugin.js").DllReferencePluginOptionsManifest} DllReferencePluginOptionsManifest */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Compiler.js").CompilationParams} CompilationParams */
/** @typedef {import("../util/fs.js").InputFileSystem} InputFileSystem */

/** @typedef {{ path: string, data: DllReferencePluginOptionsManifest | undefined, error: Error | undefined }} CompilationDataItem */

const PLUGIN_NAME = "DllReferencePlugin";

class DllReferencePlugin {
	/**
	 * Creates an instance of DllReferencePlugin.
	 * @param {DllReferencePluginOptions} options options object
	 */
	constructor(options) {
		/** @type {DllReferencePluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../../schemas/plugins/dll/DllReferencePlugin.json"),
				this.options,
				{
					name: "Dll Reference Plugin",
					baseDataPath: "options"
				},
				(options) =>
					/** @type {typeof import("../../schemas/plugins/dll/DllReferencePlugin.check.js")} */ (
						require("../../schemas/plugins/dll/DllReferencePlugin.check.js")
					)(options)
			);
		});
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					DelegatedSourceDependency,
					normalModuleFactory
				);
			}
		);

		/** @type {WeakMap<CompilationParams, CompilationDataItem>} */
		const compilationData = new WeakMap();

		compiler.hooks.beforeCompile.tapAsync(PLUGIN_NAME, (params, callback) => {
			if ("manifest" in this.options) {
				const manifest = this.options.manifest;
				if (typeof manifest === "string") {
					/** @type {InputFileSystem} */
					(compiler.inputFileSystem).readFile(manifest, (err, result) => {
						if (err) return callback(err);
						/** @type {CompilationDataItem} */
						const data = {
							path: manifest,
							data: undefined,
							error: undefined
						};
						// Catch errors parsing the manifest so that blank
						// or malformed manifest files don't kill the process.
						try {
							data.data =
								/** @type {DllReferencePluginOptionsManifest} */
								(
									/** @type {unknown} */
									(parseJson(/** @type {Buffer} */ (result).toString("utf8")))
								);
						} catch (parseErr) {
							// Store the error in the params so that it can
							// be added as a compilation error later on.
							const manifestPath = makePathsRelative(
								compiler.context,
								manifest,
								compiler.root
							);
							data.error = new DllManifestError(
								manifestPath,
								/** @type {Error} */ (parseErr).message
							);
						}
						compilationData.set(params, data);
						return callback();
					});
					return;
				}
			}
			return callback();
		});

		compiler.hooks.compile.tap(PLUGIN_NAME, (params) => {
			let name = this.options.name;
			let sourceType = this.options.sourceType;
			let resolvedContent =
				"content" in this.options ? this.options.content : undefined;
			if ("manifest" in this.options) {
				const manifestParameter = this.options.manifest;
				/** @type {undefined | DllReferencePluginOptionsManifest} */
				let manifest;
				if (typeof manifestParameter === "string") {
					const data =
						/** @type {CompilationDataItem} */
						(compilationData.get(params));
					// If there was an error parsing the manifest
					// file, exit now because the error will be added
					// as a compilation error in the "compilation" hook.
					if (data.error) {
						return;
					}
					manifest = data.data;
				} else {
					manifest = manifestParameter;
				}
				if (manifest) {
					if (!name) name = manifest.name;
					if (!sourceType) sourceType = manifest.type;
					if (!resolvedContent) resolvedContent = manifest.content;
				}
			}
			/** @type {Externals} */
			const externals = {};
			const source = `dll-reference ${name}`;
			externals[source] = /** @type {string} */ (name);
			const normalModuleFactory = params.normalModuleFactory;
			new ExternalModuleFactoryPlugin(sourceType || "var", externals).apply(
				normalModuleFactory
			);
			new DelegatedModuleFactoryPlugin({
				source,
				type: this.options.type,
				scope: this.options.scope,
				context: this.options.context || compiler.context,
				content:
					/** @type {DllReferencePluginOptionsContent} */
					(resolvedContent),
				extensions: this.options.extensions,
				associatedObjectForCache: compiler.root
			}).apply(normalModuleFactory);
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation, params) => {
			if ("manifest" in this.options) {
				const manifest = this.options.manifest;
				if (typeof manifest === "string") {
					const data =
						/** @type {CompilationDataItem} */
						(compilationData.get(params));
					// If there was an error parsing the manifest file, add the
					// error as a compilation error to make the compilation fail.
					if (data.error) {
						compilation.errors.push(
							/** @type {DllManifestError} */ (data.error)
						);
					}
					compilation.fileDependencies.add(manifest);
				}
			}
		});
	}
}

class DllManifestError extends WebpackError {
	/**
	 * Creates an instance of DllManifestError.
	 * @param {string} filename filename of the manifest
	 * @param {string} message error message
	 */
	constructor(filename, message) {
		super();

		/** @type {string} */
		this.name = "DllManifestError";
		/** @type {string} */
		this.message = `Dll manifest ${filename}\n${message}`;
	}
}

export default DllReferencePlugin;

export { DllReferencePlugin as "module.exports" };
