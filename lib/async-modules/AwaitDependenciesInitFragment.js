/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");

const generateCode = promises => {
	if (promises.length === 0) {
		return "";
	}
	if (promises.length === 1) {
		return `${promises[0]} = await Promise.resolve(${promises[0]});\n`;
	}
	const sepPromises = promises.join(", ");
	return `([${sepPromises}] = await Promise.all([${sepPromises}]));\n`;
};

class AwaitDependenciesInitFragment extends InitFragment {
	/**
	 * @param {string[]} promises the promises that should be awaited
	 */
	constructor(promises) {
		super(
			generateCode(promises),
			InitFragment.STAGE_ASYNC_DEPENDENCIES,
			0,
			"await-dependencies"
		);
		this.promises = promises;
	}

	merge(other) {
		return new AwaitDependenciesInitFragment(
			Array.from(new Set(other.promises.concat(this.promises)))
		);
	}
}

module.exports = AwaitDependenciesInitFragment;
