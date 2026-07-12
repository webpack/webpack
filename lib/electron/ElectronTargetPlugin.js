/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ExternalsPlugin from "../ExternalsPlugin.js";
/** @typedef {import("../../declarations/WebpackOptions.js").ExternalsType} ExternalsType */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {"main" | "preload" | "renderer"} ElectronContext */

class ElectronTargetPlugin {
	/**
	 * Creates an instance of ElectronTargetPlugin.
	 * @param {ElectronContext=} context in main, preload or renderer context?
	 * @param {ExternalsType=} type default external type
	 */
	constructor(context, type = "node-commonjs") {
		/** @type {ElectronContext | undefined} */
		this._context = context;
		/** @type {ExternalsType} */
		this.type = type;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/**
		 * @param {Dependency} dependency the dependency
		 * @returns {ExternalsType} the external type
		 */
		const externalType = (dependency) => {
			// When `require` electron built-in modules with module output
			// we should still emit `node-commonjs` for compatibility
			if (dependency.category === "commonjs") {
				return "node-commonjs";
			}

			return this.type;
		};
		new ExternalsPlugin(externalType, [
			"clipboard",
			"crash-reporter",
			"electron",
			"ipc",
			"native-image",
			"original-fs",
			"screen",
			"shell"
		]).apply(compiler);
		switch (this._context) {
			case "main":
				new ExternalsPlugin(externalType, [
					"app",
					"auto-updater",
					"browser-window",
					"content-tracing",
					"dialog",
					"global-shortcut",
					"ipc-main",
					"menu",
					"menu-item",
					"power-monitor",
					"power-save-blocker",
					"protocol",
					"session",
					"tray",
					"web-contents"
				]).apply(compiler);
				break;
			case "preload":
			case "renderer":
				new ExternalsPlugin(externalType, [
					"desktop-capturer",
					"ipc-renderer",
					"remote",
					"web-frame"
				]).apply(compiler);
				break;
		}
	}
}

export default ElectronTargetPlugin;

export { ElectronTargetPlugin as "module.exports" };
