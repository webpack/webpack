/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { parseOptions } = require("../container/options");
const ConsumeSharedPlugin = require("./ConsumeSharedPlugin");
const ProvideSharedPlugin = require("./ProvideSharedPlugin");
const { isRequiredVersion } = require("./utils");

/**
 * @import {
 * 	ConsumesConfig
 * } from "./ConsumeSharedPlugin"
 */
/**
 * @import {
 * 	ProvidesConfig
 * } from "./ProvideSharedPlugin"
 */
/** @import Compiler from "../Compiler" */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
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
 * Options for shared modules.
 * @schema plugins/sharing/SharePlugin
 * @typedef {object} SharePluginOptions
 * @property {NonEmptyString=} shareScope Share scope name used for all shared modules (defaults to 'default').
 * @property {Shared} shared
 */

class SharePlugin {
	/**
	 * Creates an instance of SharePlugin.
	 * @param {SharePluginOptions} options options
	 */
	constructor(options) {
		/** @type {[string, SharedConfig][]} */
		const sharedOptions = parseOptions(
			options.shared,
			(item, key) => {
				if (typeof item !== "string") {
					throw new Error("Unexpected array in shared");
				}
				/** @type {SharedConfig} */
				const config =
					item === key || !isRequiredVersion(item)
						? {
								import: item
							}
						: {
								import: key,
								requiredVersion: item
							};
				return config;
			},
			(item) => item
		);
		/** @type {Record<string, ConsumesConfig>[]} */
		const consumes = sharedOptions.map(([key, options]) => ({
			[key]: {
				import: options.import,
				shareKey: options.shareKey || key,
				shareScope: options.shareScope,
				requiredVersion: options.requiredVersion,
				strictVersion: options.strictVersion,
				singleton: options.singleton,
				packageName: options.packageName,
				eager: options.eager,
				include: options.include,
				exclude: options.exclude
			}
		}));
		/** @type {Record<string, ProvidesConfig>[]} */
		const provides = sharedOptions
			.filter(([, options]) => options.import !== false)
			.map(([key, options]) => ({
				[options.import || key]: {
					shareKey: options.shareKey || key,
					shareScope: options.shareScope,
					version: options.version,
					eager: options.eager,
					include: options.include,
					exclude: options.exclude
				}
			}));
		/** @type {string | undefined} */
		this._shareScope = options.shareScope;
		/** @type {Record<string, ConsumesConfig>[]} */
		this._consumes = consumes;
		/** @type {Record<string, ProvidesConfig>[]} */
		this._provides = provides;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		new ConsumeSharedPlugin({
			shareScope: this._shareScope,
			consumes: this._consumes
		}).apply(compiler);
		new ProvideSharedPlugin({
			shareScope: this._shareScope,
			provides: this._provides
		}).apply(compiler);
	}
}

module.exports = SharePlugin;
