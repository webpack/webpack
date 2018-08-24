/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DllModule = require("./DllModule");

class DllModuleFactory {
	constructor() {
		this.hooks = Object.freeze({});
	}
	create(data, callback) {
		const dependency = data.dependencies[0];
		callback(
			null,
			new DllModule(data.context, dependency.dependencies, dependency.name)
		);
	}
}

module.exports = DllModuleFactory;
