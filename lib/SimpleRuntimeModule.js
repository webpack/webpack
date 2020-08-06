/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeModule = require("./RuntimeModule");
const Template = require("./Template");

class SimpleRuntimeModule extends RuntimeModule {
	/**
	 * @param {string} name name
	 * @param {string} runtimeGlobal runtime global
	 * @param {string} expression expression
	 */
	constructor(name, runtimeGlobal, expression) {
		super(name);
		this.runtimeGlobal = runtimeGlobal;
		this.expression = expression;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return Template.asString([`${this.runtimeGlobal} = ${this.expression};`]);
	}
}

module.exports = SimpleRuntimeModule;
