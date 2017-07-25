/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const ImportDependency = require("./ImportDependency");
const ImportEagerWeakDependency = require("./ImportEagerWeakDependency");

module.exports = class ImportDependenciesBlock extends AsyncDependenciesBlock {
	constructor(request, range, chunkName, module, loc, mode) {
		super(chunkName, module, loc);
		this.range = range;
		const dep = mode === "eager-weak" ? new ImportEagerWeakDependency(request, this) : new ImportDependency(request, this, mode);
		dep.loc = loc;
		this.addDependency(dep);
	}
};
