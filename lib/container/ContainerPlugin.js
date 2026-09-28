/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const ContainerEntryDependency = require("./ContainerEntryDependency");
const ContainerEntryModuleFactory = require("./ContainerEntryModuleFactory");
const ContainerExposedDependency = require("./ContainerExposedDependency");
const getModuleFederationCompilationHooks = require("./moduleFederationHooks");
const { parseOptions } = require("./options");

/** @import Compiler from "../Compiler" */
/** @import { ExposesList } from "./ContainerEntryModule" */

/**
 * A JavaScript identifier, or several joined by dots.
 * @minLength 1
 * @pattern ^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$
 * @typedef {string} DottedIdentifier
 */

/**
 * A path that is neither empty nor absolute.
 * @minLength 1
 * @absolutePath false
 * @typedef {string} NonEmptyRelativePath
 */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * Append the same comment above each import style.
 * @inline
 * @typedef {string} AuxiliaryCommentBranch1
 */

/**
 * Modules that should be exposed by this container.
 * @inline
 * @typedef {ExposesItem | ExposesObject} ExposesBranch1Item
 */

/**
 * Modules that should be exposed by this container.
 * @inline
 * @typedef {ExposesConfig | ExposesItem | ExposesItems} ExposesObjectValue
 */

/**
 * Part of the name of the property exposed globally by a UMD library.
 * @inline
 * @typedef {NonEmptyString} LibraryCustomUmdObjectRootBranch1Item
 */

/**
 * Part of the export that should be exposed as library.
 * @inline
 * @typedef {NonEmptyString} LibraryExportBranch1Item
 */

/**
 * A part of the library name.
 * @inline
 * @typedef {NonEmptyString} LibraryNameBranch1Item
 */

/**
 * @minItems 1
 * @inline
 * @typedef {LibraryNameBranch1Item[]} LibraryNameBranch1
 */

/**
 * Add a container for define/require functions in the AMD module.
 * @typedef {NonEmptyString} AmdContainer
 */

/**
 * Add a comment in the UMD wrapper.
 * @typedef {AuxiliaryCommentBranch1 | LibraryCustomUmdCommentObject} AuxiliaryComment
 */

/**
 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
 * @typedef {false | NonEmptyString} EntryRuntime
 */

/**
 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
 * @typedef {ExposesBranch1Item[] | ExposesObject} Exposes
 */

/**
 * Advanced configuration for modules that should be exposed by this container.
 * @typedef {object} ExposesConfig
 * @property {ExposesItem | ExposesItems} import Request to a module that should be exposed by this container.
 * @property {string=} name Custom chunk name for the exposed module.
 */

/**
 * Module that should be exposed by this container.
 * @typedef {NonEmptyString} ExposesItem
 */

/**
 * Modules that should be exposed by this container.
 * @typedef {ExposesItem[]} ExposesItems
 */

/**
 * Modules that should be exposed by this container. Property names are used as public paths.
 * @typedef {{ [key: string]: ExposesObjectValue }} ExposesObject
 */

/**
 * Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
 * @typedef {object} LibraryCustomUmdCommentObject
 * @property {string=} amd Set comment for `amd` section in UMD.
 * @property {string=} commonjs Set comment for `commonjs` (exports) section in UMD.
 * @property {string=} commonjs2 Set comment for `commonjs2` (module.exports) section in UMD.
 * @property {string=} root Set comment for `root` (global variable) section in UMD.
 */

/**
 * Description object for all UMD variants of the library name.
 * @typedef {object} LibraryCustomUmdObject
 * @property {NonEmptyString=} amd Name of the exposed AMD library in the UMD.
 * @property {NonEmptyString=} commonjs Name of the exposed commonjs export in the UMD.
 * @property {LibraryCustomUmdObjectRootBranch1Item[] | NonEmptyString=} root Name of the property exposed globally by a UMD library.
 */

/**
 * Which modules of an entry the library exposes the exports of: only the last one, or all of them, where a name more than one module binds differently is left out, as 'export *' does.
 * @since 5.112.0
 * @typedef {"last" | "all"} LibraryEntryExports
 */

/**
 * Specify which export should be exposed as library.
 * @typedef {LibraryExportBranch1Item[] | NonEmptyString} LibraryExport
 */

/**
 * The name of the library (some types allow unnamed libraries too).
 * @typedef {LibraryNameBranch1 | NonEmptyString | LibraryCustomUmdObject} LibraryName
 */

/**
 * Options for library.
 * @typedef {object} LibraryOptions
 * @property {AmdContainer=} amdContainer
 * @property {AuxiliaryComment=} auxiliaryComment
 * @property {LibraryEntryExports=} entryExports
 * @property {LibraryExport=} export
 * @property {LibraryName=} name
 * @property {LibraryType} type
 * @property {UmdAmdContainer=} umdAmdContainer
 * @property {UmdNamedDefine=} umdNamedDefine
 */

/**
 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
 * @typedef {("var" | "module" | "assign" | "assign-properties" | "this" | "window" | "self" | "global" | "commonjs" | "commonjs2" | "commonjs-module" | "commonjs-static" | "amd" | "amd-require" | "umd" | "umd2" | "jsonp" | "system") | string} LibraryType
 */

/**
 * Add a branch to the UMD wrapper for an AMD-style loader exposing `define` on a container object, given as a dot-separated path, after the `define.amd` branch.
 * @since 5.110.0
 * @typedef {DottedIdentifier} UmdAmdContainer
 */

/**
 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
 * @typedef {boolean} UmdNamedDefine
 */

/**
 * @required name, exposes
 * @schema plugins/container/ContainerPlugin
 * @typedef {object} ContainerPluginOptions
 * @property {Exposes} exposes
 * @property {NonEmptyRelativePath=} filename The filename for this container relative path inside the `output.path` directory.
 * @property {LibraryOptions=} library
 * @property {NonEmptyString} name The name for this container.
 * @property {EntryRuntime=} runtime
 * @property {NonEmptyString=} shareScope The name of the share scope which is shared with the host (defaults to 'default').
 */

const PLUGIN_NAME = "ContainerPlugin";

class ContainerPlugin {
	/**
	 * Creates an instance of ContainerPlugin.
	 * @param {ContainerPluginOptions} options options
	 */
	constructor(options) {
		/** @type {ContainerPluginOptions} */
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
				() => require("../../schemas/plugins/container/ContainerPlugin.json"),
				this.options,
				{
					name: "Container Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/container/ContainerPlugin.check")(
						options
					)
			);
		});

		const library = this.options.library || {
			type: "var",
			name: this.options.name
		};

		if (!compiler.options.output.enabledLibraryTypes.includes(library.type)) {
			compiler.options.output.enabledLibraryTypes.push(library.type);
		}

		const exposes = /** @type {ExposesList} */ (
			parseOptions(
				this.options.exposes,
				(item) => ({
					import: Array.isArray(item) ? item : [item],
					name: undefined
				}),
				(item) => ({
					import: Array.isArray(item.import) ? item.import : [item.import],
					name: item.name || undefined
				})
			)
		);

		const shareScope = this.options.shareScope || "default";

		compiler.hooks.make.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			const hooks = getModuleFederationCompilationHooks(compilation);
			const dep = new ContainerEntryDependency(
				this.options.name,
				exposes,
				shareScope
			);
			dep.loc = { name: this.options.name };
			compilation.addEntry(
				compilation.options.context,
				dep,
				{
					name: this.options.name,
					filename: this.options.filename,
					runtime: this.options.runtime,
					library
				},
				(error) => {
					if (error) return callback(error);
					hooks.addContainerEntryDependency.call(dep);
					callback();
				}
			);
		});

		compiler.hooks.thisCompilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ContainerEntryDependency,
					new ContainerEntryModuleFactory()
				);

				compilation.dependencyFactories.set(
					ContainerExposedDependency,
					normalModuleFactory
				);
			}
		);
	}
}

module.exports = ContainerPlugin;
