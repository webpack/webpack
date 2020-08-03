/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../Compilation")} Compilation */

class PublicPathRuntimeModule extends RuntimeModule {
	constructor() {
		super("publicPath");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const publicPath = this.compilation.outputOptions.publicPath || "auto";
		if (publicPath === "auto") {
			return `${RuntimeGlobals.publicPath} = (() => {
				if ("currentScript" in window.document) {
					return window.document.currentScript.src.replace(/[^\\/]+$/, "");
				} else {
					throw new Error("Webpack: Auto public path is not supported in modules or when 'document.currentScript' is unavailable. Use a polyfill or set 'publicPath' config explicitly.");
				}
			})();`;
		} else {
			return `${RuntimeGlobals.publicPath} = ${JSON.stringify(
				this.compilation.getPath(publicPath || "", {
					hash: this.compilation.hash || "XXXX"
				})
			)};`;
		}
	}
}

module.exports = PublicPathRuntimeModule;
