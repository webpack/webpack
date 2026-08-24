/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} TopLevelThisDetails
 * @property {string} name the module, by request
 * @property {number} count how many times it reads `this` at the top level
 */

class TopLevelThisWarning extends WebpackError {
	/**
	 * Creates an instance of TopLevelThisWarning.
	 * @param {TopLevelThisDetails[]} modules the modules that do it
	 * @param {number} total how many such reads there are in all
	 */
	constructor(modules, total) {
		const list = modules.map((it) => `\n  ${it.name} (${it.count})`).join("");

		super(
			`top-level this: ${total} ${total === 1 ? "read" : "reads"} of 'this' at the top level of an ES module:${list}\nwebpack is treating these as ES modules, where 'this' is 'undefined' at the top level rather than 'module.exports' — so a file that worked as CommonJS reads nothing once it is bundled this way. A single 'import' or 'export' is enough to make 'javascript/auto' decide a file is an ES module. Use 'globalThis' where the global object was meant, 'import.meta' for anything about the module, or give the file a '.cjs' extension to keep it CommonJS.\nFor more info visit https://webpack.js.org/api/module-variables/#importmeta`
		);

		/** @type {string} */
		this.name = "TopLevelThisWarning";
	}
}

module.exports = TopLevelThisWarning;
