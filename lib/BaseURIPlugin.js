/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const SimpleRuntimeModule = require("./SimpleRuntimeModule");

/** @typedef {import("../declarations/WebpackOptions").Target} Target */
/** @typedef {import("./Compiler")} Compiler */

class BaseURIPlugin {
	/**
	 * @param {string=} baseURISource baseURI source
	 */
	constructor(baseURISource) {
		this.baseURISource = baseURISource;
	}
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		let baseURISource = this.baseURISource;

		if (!baseURISource) {
			const target = compiler.options.target;

			switch (target) {
				case "webworker":
					baseURISource = "self.location";
					break;
				case "node":
				case "async-node":
				case "node-webkit":
				case "electron-main":
				case "electron-preload":
					baseURISource = "require('url').pathToFileURL(__filename)";
					break;
				case "web":
				case "electron-renderer":
					baseURISource = "document.baseURI";
					break;
			}
		}

		if (!baseURISource) return;

		compiler.hooks.compilation.tap("BaseURIPlugin", compilation => {
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.baseURI)
				.tap("BaseURIPlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new SimpleRuntimeModule(
							"baseURI",
							RuntimeGlobals.baseURI,
							baseURISource
						)
					);
				});
		});
	}
}

module.exports = BaseURIPlugin;
