/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeModule = require("./RuntimeModule");
const Template = require("./Template");

class BaseURIRuntimeModule extends RuntimeModule {
	/**
	 * @param {"node"|"web"|"webworker"} environment environment
	 */
	constructor(environment) {
		super("baseURI");
		this.env = environment;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		switch (this.env) {
			case "web":
				return Template.asString([
					`${RuntimeGlobals.baseURI} = document.baseURI;`
				]);
			case "webworker":
				return Template.asString([
					`${RuntimeGlobals.baseURI} = self.location;`
				]);
			case "node":
				return Template.asString([
					`${RuntimeGlobals.baseURI} = require('url').pathToFileURL(__filename);`
				]);
			default:
				return "";
		}
	}
}

module.exports = BaseURIRuntimeModule;
