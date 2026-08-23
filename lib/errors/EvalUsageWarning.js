/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class EvalUsageWarning extends WebpackError {
	/**
	 * Creates an instance of EvalUsageWarning.
	 * @param {string[]} modules the modules calling it, named for the report
	 * @param {number} total how many call it in all
	 */
	constructor(modules, total) {
		const list = modules.map((module) => `\n  ${module}`).join("");

		super(
			`eval usage: ${total} ${total === 1 ? "module calls" : "modules call"} 'eval' directly:${list}\nA direct eval reads and writes any name in scope, so nothing the module declares can be renamed or dropped: minification, scope hoisting and tree shaking all stop at it. 'new Function' takes no local scope and does not.\nFor more info visit https://webpack.js.org/configuration/optimization/#optimizationconcatenatemodules`
		);

		/** @type {string} */
		this.name = "EvalUsageWarning";
	}
}

module.exports = EvalUsageWarning;
