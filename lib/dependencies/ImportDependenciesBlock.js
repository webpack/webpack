/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const ImportDependency = require("./ImportDependency");

module.exports = class ImportDependenciesBlock extends AsyncDependenciesBlock {
	constructor(request, range, chunkName, module, loc) {
		super(chunkName, module, loc);
		this.range = range;
		const dep = new ImportDependency(request, this);
		dep.loc = loc;
		this.addDependency(dep);
	}
};
