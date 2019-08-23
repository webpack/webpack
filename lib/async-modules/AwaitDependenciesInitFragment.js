/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");

/** @typedef {import("webpack-sources").Source} Source */

class AwaitDependenciesInitFragment extends InitFragment {
	/**
	 * @param {Set<string>} promises the promises that should be awaited
	 */
	constructor(promises) {
		super(
			undefined,
			InitFragment.STAGE_ASYNC_DEPENDENCIES,
			0,
			"await-dependencies"
		);
		this.promises = promises;
	}

	merge(other) {
		const promises = new Set(this.promises);
		for (const p of other.promises) {
			promises.add(p);
		}
		return new AwaitDependenciesInitFragment(promises);
	}

	/**
	 * @returns {string|Source} the source code that will be included as initialization code
	 */
	getContent() {
		const promises = this.promises;
		if (promises.size === 0) {
			return "";
		}
		if (promises.size === 1) {
			for (const p of promises) {
				return `${p} = await Promise.resolve(${p});\n`;
			}
		}
		const sepPromises = Array.from(promises).join(", ");
		return `([${sepPromises}] = await Promise.all([${sepPromises}]));\n`;
	}
}

module.exports = AwaitDependenciesInitFragment;
