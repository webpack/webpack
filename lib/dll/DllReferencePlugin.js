/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../errors/WebpackError");
const ExternalModuleFactoryPlugin = require("../externals/ExternalModuleFactoryPlugin");
const { fileUrlToPath, makePathsRelative } = require("../util/identifier");
const parseJson = require("../util/parseJson");
const DelegatedModuleFactoryPlugin = require("./DelegatedModuleFactoryPlugin");
const DelegatedSourceDependency = require("./DelegatedSourceDependency");

/** @import { Externals } from "../../declarations/WebpackOptions" */
/** @import Compiler, { CompilationParams } from "../Compiler" */
/** @import { InputFileSystem } from "../fs/fs" */

/**
 * An absolute path.
 * @absolutePath true
 * @typedef {string} AbsolutePath
 */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * Name of the export.
 * @inline
 * @typedef {NonEmptyString} DllReferencePluginOptionsContentValueExportsBranch1Item
 */

/**
 * List of provided exports of the module.
 * @inline
 * @typedef {DllReferencePluginOptionsContentValueExportsBranch1Item[]} DllReferencePluginOptionsContentValueExportsBranch1
 */

/**
 * Exports unknown/dynamic.
 * @inline
 * @typedef {true} DllReferencePluginOptionsContentValueExportsBranch2
 */

/**
 * Module info.
 * @inline
 * @typedef {object} DllReferencePluginOptionsContentValue
 * @property {{ [key: string]: any }=} buildMeta Meta information about the module.
 * @property {DllReferencePluginOptionsContentValueExportsBranch1 | DllReferencePluginOptionsContentValueExportsBranch2=} exports Information about the provided exports of the module.
 * @property {number | NonEmptyString} id Module ID.
 */

/**
 * An extension.
 * @inline
 * @typedef {string} DllReferencePluginOptionsBranch1ObjectExtensionsItem
 */

/**
 * @inline
 * @typedef {object} DllReferencePluginOptionsBranch1Object
 * @property {AbsolutePath=} context Context of requests in the manifest (or content property) as absolute path.
 * @property {DllReferencePluginOptionsBranch1ObjectExtensionsItem[]=} extensions Extensions used to resolve modules in the dll bundle (only used when using 'scope').
 * @property {AbsolutePath | DllReferencePluginOptionsManifest} manifest An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
 * @property {NonEmptyString=} name The name where the dll is exposed (external name, defaults to manifest.name).
 * @property {NonEmptyString=} scope Prefix which is used for accessing the content of the dll.
 * @property {DllReferencePluginOptionsSourceType=} sourceType How the dll is exposed (libraryTarget, defaults to manifest.type).
 * @property {"require" | "object"=} type The way how the export of the dll bundle is used.
 */

/**
 * An extension.
 * @inline
 * @typedef {string} DllReferencePluginOptionsBranch2ObjectExtensionsItem
 */

/**
 * @inline
 * @typedef {object} DllReferencePluginOptionsBranch2Object
 * @property {DllReferencePluginOptionsContent} content
 * @property {AbsolutePath=} context Context of requests in the manifest (or content property) as absolute path.
 * @property {DllReferencePluginOptionsBranch2ObjectExtensionsItem[]=} extensions Extensions used to resolve modules in the dll bundle (only used when using 'scope').
 * @property {NonEmptyString} name The name where the dll is exposed (external name).
 * @property {NonEmptyString=} scope Prefix which is used for accessing the content of the dll.
 * @property {DllReferencePluginOptionsSourceType=} sourceType How the dll is exposed (libraryTarget).
 * @property {"require" | "object"=} type The way how the export of the dll bundle is used.
 */

/**
 * The mappings from request to module info.
 * @minProperties 1
 * @typedef {{ [key: string]: DllReferencePluginOptionsContentValue }} DllReferencePluginOptionsContent
 */

/**
 * An object containing content, name and type.
 * @typedef {object} DllReferencePluginOptionsManifest
 * @property {DllReferencePluginOptionsContent} content
 * @property {NonEmptyString=} name The name where the dll is exposed (external name).
 * @property {DllReferencePluginOptionsSourceType=} type
 */

/**
 * The type how the dll is exposed (external type).
 * @typedef {"var" | "assign" | "this" | "window" | "global" | "commonjs" | "commonjs2" | "commonjs-module" | "amd" | "amd-require" | "umd" | "umd2" | "jsonp" | "system"} DllReferencePluginOptionsSourceType
 */

/**
 * @schema plugins/dll/DllReferencePlugin
 * @typedef {DllReferencePluginOptionsBranch1Object | DllReferencePluginOptionsBranch2Object} DllReferencePluginOptions
 */

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
					require("../../schemas/plugins/dll/DllReferencePlugin.check")(options)
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
					const manifestPath = fileUrlToPath(manifest);
					/** @type {InputFileSystem} */
					(compiler.inputFileSystem).readFile(manifestPath, (err, result) => {
						if (err) return callback(err);
						/** @type {CompilationDataItem} */
						const data = {
							path: manifestPath,
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
							const relativePath = makePathsRelative(
								compiler.context,
								manifestPath,
								compiler.root
							);
							data.error = new DllManifestError(
								relativePath,
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
				context: this.options.context
					? fileUrlToPath(this.options.context)
					: compiler.context,
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
					compilation.fileDependencies.add(fileUrlToPath(manifest));
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

module.exports = DllReferencePlugin;
