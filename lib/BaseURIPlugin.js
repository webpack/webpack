/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const BaseURIRuntimeModule = require("./BaseURIRuntimeModule");
const RuntimeGlobals = require("./RuntimeGlobals");

/** @typedef {import("../declarations/WebpackOptions").Target} Target */
/** @typedef {import("./Compiler")} Compiler */

class BaseURIPlugin {
	/**
	 * @param {Target} target target
	 */
	constructor(target) {
		switch (target) {
			case "webworker":
				this.environment = /** @type {"webworker"} */ ("webworker");
				break;
			case "node":
			case "async-node":
			case "node-webkit":
			case "electron-main":
			case "electron-preload":
				this.environment = /** @type {"node"} */ ("node");
				break;
			default:
				this.environment = /** @type {"web"} */ ("web");
				break;
		}
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("BaseURIPlugin", compilation => {
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.baseURI)
				.tap("BaseURIPlugin", (chunk, set) => {
					compilation.addRuntimeModule(
						chunk,
						new BaseURIRuntimeModule(this.environment)
					);
				});
		});
	}
}

module.exports = BaseURIPlugin;
