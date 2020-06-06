/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class SelfModuleFactory {
	constructor(moduleGraph) {
		this.moduleGraph = moduleGraph;
	}

	create(data, callback) {
		const module = this.moduleGraph.getParentModule(data.dependencies[0]);
		callback(null, {
			module
		});
	}
}

module.exports = SelfModuleFactory;
