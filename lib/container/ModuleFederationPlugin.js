/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const isValidExternalsType = require("../../schemas/plugins/container/ExternalsType.check");
const SharePlugin = require("../sharing/SharePlugin");
const ContainerPlugin = require("./ContainerPlugin");
const ContainerReferencePlugin = require("./ContainerReferencePlugin");
const HoistContainerReferences = require("./HoistContainerReferencesPlugin");
const getCompilationHooks = require("./moduleFederationHooks");

/** @import Compiler from "../Compiler" */

/**
 * A JavaScript identifier, or several joined by dots.
 * @minLength 1
 * @pattern ^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$
 * @typedef {string} DottedIdentifier
 */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * A path that is not absolute.
 * @absolutePath false
 * @typedef {string} RelativePath
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
 * Container locations and request scopes from which modules should be resolved and loaded at runtime.
 * @inline
 * @typedef {RemotesItem | RemotesObject} RemotesBranch1Item
 */

/**
 * Container locations from which modules should be resolved and loaded at runtime.
 * @inline
 * @typedef {RemotesConfig | RemotesItem | RemotesItems} RemotesObjectValue
 */

/**
 * Modules that should be shared in the share scope.
 * @inline
 * @typedef {SharedItem | SharedObject} SharedBranch1Item
 */

/**
 * No provided or fallback module.
 * @inline
 * @typedef {false} SharedConfigImportBranch1
 */

/**
 * No version requirement check.
 * @inline
 * @typedef {false} SharedConfigRequiredVersionBranch1
 */

/**
 * Version as string. Can be prefixed with '^' or '~' for minimum matches. Each part of the version should be separated by a dot '.'.
 * @inline
 * @typedef {string} SharedConfigRequiredVersionBranch2
 */

/**
 * Don't provide a version.
 * @inline
 * @typedef {false} SharedConfigVersionBranch1
 */

/**
 * Version as string. Each part of the version should be separated by a dot '.'.
 * @inline
 * @typedef {string} SharedConfigVersionBranch2
 */

/**
 * Modules that should be shared in the share scope.
 * @inline
 * @typedef {SharedConfig | SharedItem} SharedObjectValue
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
 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
 * @typedef {"var" | "module" | "assign" | "this" | "window" | "self" | "global" | "commonjs" | "commonjs2" | "commonjs-module" | "commonjs-static" | "amd" | "amd-require" | "amd-async" | "umd" | "umd2" | "jsonp" | "system" | "promise" | "import" | "module-import" | "script" | "node-commonjs" | "asset" | "asset-url" | "css-import" | "css-url"} ExternalsType
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
 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
 * @typedef {RemotesBranch1Item[] | RemotesObject} Remotes
 */

/**
 * Advanced configuration for container locations from which modules should be resolved and loaded at runtime.
 * @typedef {object} RemotesConfig
 * @property {RemotesItem | RemotesItems} external Container locations from which modules should be resolved and loaded at runtime.
 * @property {NonEmptyString=} shareScope The name of the share scope shared with this remote.
 */

/**
 * Container location from which modules should be resolved and loaded at runtime.
 * @typedef {NonEmptyString} RemotesItem
 */

/**
 * Container locations from which modules should be resolved and loaded at runtime.
 * @typedef {RemotesItem[]} RemotesItems
 */

/**
 * Container locations from which modules should be resolved and loaded at runtime. Property names are used as request scopes.
 * @typedef {{ [key: string]: RemotesObjectValue }} RemotesObject
 */

/**
 * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
 * @typedef {SharedBranch1Item[] | SharedObject} Shared
 */

/**
 * Advanced configuration for modules that should be shared in the share scope.
 * @typedef {object} SharedConfig
 * @property {boolean=} eager Include the provided and fallback module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
 * @property {SharedModuleFilter=} exclude
 * @property {SharedConfigImportBranch1 | SharedItem=} import Provided module that should be provided to share scope. Also acts as fallback module if no shared module is found in share scope or version isn't valid. Defaults to the property name.
 * @property {SharedModuleFilter=} include
 * @property {NonEmptyString=} packageName Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
 * @property {SharedConfigRequiredVersionBranch1 | SharedConfigRequiredVersionBranch2=} requiredVersion Version requirement from module in share scope.
 * @property {NonEmptyString=} shareKey Module is looked up under this key from the share scope.
 * @property {NonEmptyString=} shareScope Share scope name.
 * @property {boolean=} singleton Allow only a single version of the shared module in share scope (disabled by default).
 * @property {boolean=} strictVersion Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
 * @property {SharedConfigVersionBranch1 | SharedConfigVersionBranch2=} version Version of the provided module. Will replace lower matching versions, but not higher.
 */

/**
 * A module that should be shared in the share scope.
 * @typedef {NonEmptyString} SharedItem
 */

/**
 * Filters shared modules by version or request: with 'include' only matching modules are shared, with 'exclude' matching ones are not. A filtered-out module is resolved and bundled as if it wasn't shared.
 * @since 5.112.0
 * @typedef {object} SharedModuleFilter
 * @property {RegExp | NonEmptyString=} request Request remainder after a key ending in a slash (e.g. 'get' for 'lodash/get' under 'lodash/'). Has no effect on other keys.
 * @property {NonEmptyString=} version Version range the module's version (from its description file or the 'version' option) is tested against. A consumed module is tested through its fallback module, so this has no effect on consumes without one.
 */

/**
 * Modules that should be shared in the share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 * @typedef {{ [key: string]: SharedObjectValue }} SharedObject
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
 * @schema plugins/container/ModuleFederationPlugin
 * @typedef {object} ModuleFederationPluginOptions
 * @property {Exposes=} exposes
 * @property {RelativePath=} filename The filename of the container as relative path inside the `output.path` directory.
 * @property {LibraryOptions=} library
 * @property {string=} name The name of the container.
 * @property {ExternalsType=} remoteType The external type of the remote containers.
 * @property {Remotes=} remotes
 * @property {EntryRuntime=} runtime
 * @property {NonEmptyString=} shareScope Share scope name used for all shared modules (defaults to 'default').
 * @property {Shared=} shared
 */

const PLUGIN_NAME = "ModuleFederationPlugin";

class ModuleFederationPlugin {
	/**
	 * Creates an instance of ModuleFederationPlugin.
	 * @param {ModuleFederationPluginOptions} options options
	 */
	constructor(options) {
		/** @type {ModuleFederationPluginOptions} */
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
				() =>
					require("../../schemas/plugins/container/ModuleFederationPlugin.json"),
				this.options,
				{
					name: "Module Federation Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/container/ModuleFederationPlugin.check")(
						options
					)
			);
		});
		const { options } = this;
		const library = options.library || { type: "var", name: options.name };
		const remoteType =
			options.remoteType ||
			(options.library && isValidExternalsType(options.library.type)
				? /** @type {ExternalsType} */ (options.library.type)
				: "script");
		if (
			library &&
			!compiler.options.output.enabledLibraryTypes.includes(library.type)
		) {
			compiler.options.output.enabledLibraryTypes.push(library.type);
		}
		compiler.hooks.afterPlugins.tap(PLUGIN_NAME, () => {
			if (
				options.exposes &&
				(Array.isArray(options.exposes)
					? options.exposes.length > 0
					: Object.keys(options.exposes).length > 0)
			) {
				new ContainerPlugin({
					name: /** @type {string} */ (options.name),
					library,
					filename: options.filename,
					runtime: options.runtime,
					shareScope: options.shareScope,
					exposes: options.exposes
				}).apply(compiler);
			}
			if (
				options.remotes &&
				(Array.isArray(options.remotes)
					? options.remotes.length > 0
					: Object.keys(options.remotes).length > 0)
			) {
				new ContainerReferencePlugin({
					remoteType,
					shareScope: options.shareScope,
					remotes: options.remotes
				}).apply(compiler);
			}
			if (options.shared) {
				new SharePlugin({
					shared: options.shared,
					shareScope: options.shareScope
				}).apply(compiler);
			}
			new HoistContainerReferences().apply(compiler);
		});
	}
}

ModuleFederationPlugin.getCompilationHooks = getCompilationHooks;

module.exports = ModuleFederationPlugin;
