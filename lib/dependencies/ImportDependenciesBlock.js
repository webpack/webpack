"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const ImportDependency = require("./ImportDependency");
class ImportDependenciesBlock extends AsyncDependenciesBlock {
	constructor(request, range, module, loc) {
		super(null, module, loc);
		this.range = range;
		const dep = new ImportDependency(request, this);
		dep.loc = loc;
		this.addDependency(dep);
	}
}
module.exports = ImportDependenciesBlock;
