/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");

/** @import { ExternalsType } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Dependency from "../Dependency" */
/** @typedef {"main" | "preload" | "renderer"} ElectronContext */

const SHARED_MODULES = [
	"clipboard",
	"crash-reporter",
	"electron",
	"ipc",
	"native-image",
	"original-fs",
	"screen",
	"shell"
];

const MAIN_MODULES = [
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
];

const RENDERER_MODULES = [
	"desktop-capturer",
	"ipc-renderer",
	"remote",
	"web-frame"
];

class ElectronTargetPlugin {
	/**
	 * @param {ElectronContext=} context in main, preload or renderer context?
	 * @param {ExternalsType=} type default external type
	 */
	constructor(context, type = "node-commonjs") {
		/** @type {ElectronContext | undefined} */
		this._context = context;
		/** @type {ExternalsType} */
		this.type = type;

		/**
		 * @param {Dependency} dependency the dependency
		 * @returns {ExternalsType} the external type
		 */
		this._externalType = (dependency) =>
			// When `require`-ing electron built-in modules with module output
			// we should still emit `node-commonjs` for compatibility
			dependency.category === "commonjs" ? "node-commonjs" : this.type;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const externals = [...SHARED_MODULES];

		switch (this._context) {
			case "main":
				externals.push(...MAIN_MODULES);
				break;
			case "preload":
			case "renderer":
				externals.push(...RENDERER_MODULES);
				break;
		}

		new ExternalsPlugin(this._externalType, externals).apply(compiler);
	}
}

module.exports = ElectronTargetPlugin;
