/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} UnusedModuleDetails
 * @property {string} name the module, by request
 * @property {number} size the bytes it adds to the bundle
 * @property {string} statement the statement that kept it, as `type at location`
 */

class UnusedModulesWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedModulesWarning.
	 * @param {UnusedModuleDetails[]} modules the modules nothing uses
	 * @param {number} total how many such modules there are
	 * @param {number} size the bytes they add between them
	 */
	constructor(modules, total, size) {
		const list = modules
			.map((it) => `\n  ${it.name} (${it.size} bytes) — ${it.statement}`)
			.join("");

		super(
			`unused modules: ${total} ${total === 1 ? "module is" : "modules are"} bundled although nothing uses what they export, costing ${size} bytes:${list}\nEach is kept only by the statement named above, which runs for its effect rather than for anything the importer reads. Move that effect to where it is wanted, or drop the import — 'sideEffects' in the package's package.json says so for a whole package at once.\nFor more info visit https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free`
		);

		/** @type {string} */
		this.name = "UnusedModulesWarning";
	}
}

module.exports = UnusedModulesWarning;
