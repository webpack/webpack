/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");

module.exports = class ImportDependenciesBlock extends AsyncDependenciesBlock {
	// TODO webpack 5 reorganize arguments
	constructor(groupOptions, loc, request, range) {
		super(groupOptions, loc, request);
		this.range = range;
	}
};
