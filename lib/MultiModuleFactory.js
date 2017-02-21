/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const Tapable = require("tapable");
const MultiModule = require("./MultiModule");

module.exports = class MultiModuleFactory extends Tapable {
  constructor() {
		super();
	}

	create(data, callback) {
		const dependency = data.dependencies[0];
		callback(null, new MultiModule(data.context, dependency.dependencies, dependency.name));
	}
};
