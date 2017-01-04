"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const Tapable = require("tapable");
const DllModule = require("./DllModule");
class DllModuleFactory extends Tapable {
	create(data, callback) {
		const dependency = data.dependencies[0];
		callback(null, new DllModule(data.context, dependency.dependencies, dependency.name, dependency.type));
	}
}
module.exports = DllModuleFactory;
