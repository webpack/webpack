/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} NamespaceCallDetails
 * @property {string} name the module, by request
 * @property {string[]} bindings the namespaces it calls
 */

class NamespaceCallWarning extends WebpackError {
	/**
	 * Creates an instance of NamespaceCallWarning.
	 * @param {NamespaceCallDetails[]} modules the modules that do it
	 * @param {number} total how many such namespaces there are in all
	 */
	constructor(modules, total) {
		const list = modules
			.map((it) => `\n  ${it.name} (${it.bindings.join(", ")})`)
			.join("");

		super(
			`namespace call: ${total} ${total === 1 ? "namespace is" : "namespaces are"} imported with 'import * as' and then called:${list}\nA module namespace is an object, never a function, so the call throws a TypeError. Where the module's default export is the function, import that instead.\nFor more info visit https://webpack.js.org/api/module-methods/#import`
		);

		/** @type {string} */
		this.name = "NamespaceCallWarning";
	}
}

module.exports = NamespaceCallWarning;
