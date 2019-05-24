/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");

const generateCode = (moduleArgument, hasAwait, promises) => {
	if (promises.length === 0) {
		return `${moduleArgument}.exports = (async function() {\n`;
	}
	const mayAsync = hasAwait ? "async " : "";
	if (promises.length === 1) {
		return `${moduleArgument}.exports = Promise.resolve(${
			promises[0]
		}).then(${mayAsync}function(${promises[0]}) {\n`;
	}
	return `${moduleArgument}.exports = Promise.all([${promises.join(
		", "
	)}]).then(${mayAsync}function([${promises.join(", ")}]) {\n`;
};

class AsyncModuleInitFragment extends InitFragment {
	/**
	 * @param {string} moduleArgument the value of module.moduleArgument
	 * @param {boolean} hasAwait true, if the module has top-level-awaits
	 * @param {string[]} promises the promises that should be awaited
	 */
	constructor(moduleArgument, hasAwait, promises) {
		super(
			generateCode(moduleArgument, hasAwait, promises),
			InitFragment.STAGE_ASYNC_BOUNDARY,
			0,
			"async-boundary",
			"return __webpack_exports__;\n" +
				(promises.length === 0 ? "})();\n" : "});\n")
		);
		this.moduleArgument = moduleArgument;
		this.hasAwait = hasAwait;
		this.promises = promises;
	}

	merge(other) {
		return new AsyncModuleInitFragment(
			this.moduleArgument,
			this.hasAwait || other.hasAwait,
			Array.from(new Set(other.promises.concat(this.promises)))
		);
	}
}

module.exports = AsyncModuleInitFragment;
