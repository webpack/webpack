/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Ivan Kopeykin @vankop
*/

/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./config/target.js").PlatformTargetProperties} PlatformTargetProperties */

const PLUGIN_NAME = "PlatformPlugin";

/**
 * Should be used only for "target === false" or
 * when you want to overwrite platform target properties
 */
class PlatformPlugin {
	/**
	 * Creates an instance of PlatformPlugin.
	 * @param {Partial<PlatformTargetProperties>} platform target properties
	 */
	constructor(platform) {
		/** @type {Partial<PlatformTargetProperties>} */
		this.platform = platform;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.environment.tap(PLUGIN_NAME, () => {
			compiler.platform = {
				...compiler.platform,
				...this.platform
			};
		});
	}
}

export default PlatformPlugin;

export { PlatformPlugin as "module.exports" };
