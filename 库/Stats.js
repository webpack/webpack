/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author guanlong huang gl041188@gmail.com
*/

"use strict";

/** @typedef {import("../declarations/WebpackOptions").StatsOptions} StatsOptions */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsCompilation} StatsCompilation */

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
	 * @returns {boolean} true if the compilation encountered an error
	 */
	hasErrors() {
		return (
			this.compilation.errors.length > 0 ||
			this.compilation.children.some(child => child.getStats().hasErrors())
		);
	}

	/**
	 * @param {(string|StatsOptions)=} options stats options
	 * @returns {StatsCompilation} json output
	 */
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
