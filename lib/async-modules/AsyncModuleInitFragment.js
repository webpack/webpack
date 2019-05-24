/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");

const generateCode = (moduleArgument, promises) => {
	if (promises.length === 0) {
		return `${moduleArgument}.exports = (async function() {\n`;
	}
	return `${moduleArgument}.exports = Promise.all([${promises.join(
		", "
	)}]).then(async function([${promises.join(", ")}]) {\n`;
};

class AsyncModuleInitFragment extends InitFragment {
	/**
	 * @param {string} moduleArgument the value of module.moduleArgument
	 * @param {string[]} promises the promises that should be awaited
	 */
	constructor(moduleArgument, promises) {
		super(
			generateCode(moduleArgument, promises),
			InitFragment.STAGE_ASYNC_BOUNDARY,
			0,
			"async-boundary",
			"return __webpack_exports__;\n" +
				(promises.length === 0 ? "})();\n" : "});\n")
		);
		this.moduleArgument = moduleArgument;
		this.promises = promises;
	}

	merge(other) {
		return new AsyncModuleInitFragment(
			this.moduleArgument,
			Array.from(new Set(other.promises.concat(this.promises)))
		);
	}
}

module.exports = AsyncModuleInitFragment;
