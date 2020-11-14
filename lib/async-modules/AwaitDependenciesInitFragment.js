/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */

class AwaitDependenciesInitFragment extends InitFragment {
	/**
	 * @param {string} exportsArgument name of the exports argument
	 * @param {Set<string>} promises the promises that should be awaited
	 */
	constructor(exportsArgument, promises) {
		super(
			undefined,
			InitFragment.STAGE_ASYNC_DEPENDENCIES,
			0,
			"await-dependencies"
		);
		this.exportsArgument = exportsArgument;
		this.promises = promises;
	}

	merge(other) {
		const promises = new Set(this.promises);
		for (const p of other.promises) {
			promises.add(p);
		}
		return new AwaitDependenciesInitFragment(this.exportsArgument, promises);
	}

	/**
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {string|Source} the source code that will be included as initialization code
	 */
	getContent({ runtimeRequirements }) {
		runtimeRequirements.add(RuntimeGlobals.module);
		const promises = this.promises;
		if (promises.size === 0) {
			return "";
		}
		const sepPromises = Array.from(promises).join(", ");
		const asyncDepsArgument = "__webpack_async_local__";
		const assignments = [
			`var ${this.exportsArgument} = ${asyncDepsArgument}[0]`,
			...Array.from(
				promises,
				(promise, i) => `var ${promise} = ${asyncDepsArgument}[${i + 1}]`
			)
		].join("\n");
		return `${this.exportsArgument} = Promise.all([${this.exportsArgument}, ${sepPromises}]).then(${asyncDepsArgument} => {\n${assignments};\n`;
	}

	/**
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {string|Source=} the source code that will be included at the end of the module
	 */
	getEndContent(generateContext) {
		if (this.promises.size > 0) {
			return `\nreturn ${this.exportsArgument}; \n});`;
		}
	}
}

module.exports = AwaitDependenciesInitFragment;
