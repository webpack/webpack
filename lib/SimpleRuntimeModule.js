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
	 * @param {string} target target
	 */
	constructor(name, runtimeGlobal, target) {
		super(name);
		this.runtimeGlobal = runtimeGlobal;
		this.target = target;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return Template.asString([`${this.runtimeGlobal} = ${this.target};`]);
	}
}

module.exports = SimpleRuntimeModule;
