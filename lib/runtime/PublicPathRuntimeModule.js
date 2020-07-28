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
				if ("currentScript" in document) {
					return document.currentScript.src.replace(/[^\\/]+$/, "");
				} else if ("_getCurrentScript" in document) {
					return document._getCurrentScript().src.replace(/[^\\/]+$/, "");
				} else {
					return ${JSON.stringify(
						this.compilation.getPath(
							this.compilation.outputOptions.publicPath || "",
							{
								hash: this.compilation.hash || "XXXX"
							}
						)
					)};
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
