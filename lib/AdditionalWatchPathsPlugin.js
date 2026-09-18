/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Mayur Jogade @himayurjogade
*/

"use strict";

const path = require("path");

/** @import { WatchOptions } from "../declarations/WebpackOptions" */
/** @import Compiler from "./Compiler" */

const PLUGIN_NAME = "AdditionalWatchPathsPlugin";

class AdditionalWatchPathsPlugin {
	/**
	 * Creates an instance of AdditionalWatchPathsPlugin.
	 * @param {NonNullable<WatchOptions["additional"]>} additional paths to watch; a trailing slash marks a directory
	 */
	constructor(additional) {
		/** @type {string[]} */
		this._additional = Array.isArray(additional) ? additional : [additional];
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.afterCompile.tap(PLUGIN_NAME, (compilation) => {
			for (const request of this._additional) {
				const isDirectory = request.endsWith("/") || request.endsWith("\\");
				const resolved = path.resolve(compiler.context, request);
				if (isDirectory) {
					compilation.contextDependencies.add(resolved);
				} else {
					compilation.fileDependencies.add(resolved);
				}
			}
		});
	}
}

module.exports = AdditionalWatchPathsPlugin;
