/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./WebpackError")} WebpackError */

class Stats {
	/**
	 * @param {Compilation} compilation webpack compilation
	 */
	constructor(compilation) {
		this.compilation = compilation;
	}

	get hash() {
		return this.compilation.hash;
	}

	get startTime() {
		return this.compilation.startTime;
	}

	get endTime() {
		return this.compilation.endTime;
	}

	/**
	 * @returns {boolean} true if the compilation had a warning
	 */
	hasWarnings() {
		return (
			this.compilation.warnings.length > 0 ||
			this.compilation.children.some(child => child.getStats().hasWarnings())
		);
	}

	/**
	 * @returns {WebpackError[]} array of warnings occurred in this stats or its children
	 */
	getWarnings() {
		return [].concat(
			...this.compilation.warnings,
			...this.compilation.children
				.filter(child => child.getStats().hasWarnings())
				.map(child => child.getStats().getWarnings())
		);
	}

	/**
	 * @returns {boolean} true if the compilation encountered an error
	 */
	hasErrors() {
		return (
			this.compilation.errors.length > 0 ||
			this.compilation.children.some(child => child.getStats().hasErrors())
		);
	}

	/**
	 * @returns {WebpackError[]} array of errors occurred in this stats or its children
	 */
	getErrors() {
		return [].concat(
			...this.compilation.errors,
			...this.compilation.children
				.filter(child => child.getStats().hasErrors())
				.map(child => child.getStats().getErrors())
		);
	}

	toJson(options) {
		options = this.compilation.createStatsOptions(options, {
			forToString: false
		});

		const statsFactory = this.compilation.createStatsFactory(options);

		return statsFactory.create("compilation", this.compilation, {
			compilation: this.compilation
		});
	}

	toString(options) {
		options = this.compilation.createStatsOptions(options, {
			forToString: true
		});

		const statsFactory = this.compilation.createStatsFactory(options);
		const statsPrinter = this.compilation.createStatsPrinter(options);

		const data = statsFactory.create("compilation", this.compilation, {
			compilation: this.compilation
		});
		const result = statsPrinter.print("compilation", data);
		return result === undefined ? "" : result;
	}
}

module.exports = Stats;
