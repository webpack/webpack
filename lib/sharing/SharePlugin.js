/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

import { parseOptions } from "../container/options.js";
import ConsumeSharedPlugin from "./ConsumeSharedPlugin.js";
import ProvideSharedPlugin from "./ProvideSharedPlugin.js";
import { isRequiredVersion } from "./utils.js";
/** @typedef {import("../../declarations/plugins/sharing/ConsumeSharedPlugin.js").ConsumesConfig} ConsumesConfig */
/** @typedef {import("../../declarations/plugins/sharing/ProvideSharedPlugin.js").ProvidesConfig} ProvidesConfig */
/** @typedef {import("../../declarations/plugins/sharing/SharePlugin.js").SharePluginOptions} SharePluginOptions */
/** @typedef {import("../../declarations/plugins/sharing/SharePlugin.js").SharedConfig} SharedConfig */
/** @typedef {import("../Compiler.js").default} Compiler */

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
				eager: options.eager
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
					eager: options.eager
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

export default SharePlugin;

export { SharePlugin as "module.exports" };
