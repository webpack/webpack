/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");

const generateCode = promises => {
	if (promises.length === 0) {
		return `__webpack_module__.exports = (async function() {\n`;
	}
	return `__webpack_module__.exports = Promise.all([${promises.join(
		", "
	)}]).then(async function([${promises.join(", ")}]) {\n`;
};

class AsyncModuleInitFragment extends InitFragment {
	/**
	 * @param {string[]} promises the promises that should be awaited
	 */
	constructor(promises) {
		super(
			generateCode(promises),
			InitFragment.STAGE_ASYNC_BOUNDARY,
			0,
			"async-boundary",
			"return __webpack_exports__;\n" +
				(promises.length === 0 ? "})();\n" : "});\n")
		);
		this.promises = promises;
	}

	merge(other) {
		return new AsyncModuleInitFragment(
			Array.from(new Set(other.promises.concat(this.promises)))
		);
	}
}

module.exports = AsyncModuleInitFragment;
