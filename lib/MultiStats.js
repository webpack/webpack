/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Stats = require("./Stats");

const optionOrFallback = (optionValue, fallbackValue) =>
	optionValue !== undefined ? optionValue : fallbackValue;

class MultiStats {
	/**
	 * @param {Stats[]} stats the child stats
	 */
	constructor(stats) {
		this.stats = stats;
		this.hash = stats.map(stat => stat.hash).join("");
	}

	/**
	 * @returns {boolean} true if a child compilation encountered an error
	 */
	hasErrors() {
		return this.stats.some(stat => stat.hasErrors());
	}

	/**
	 * @returns {boolean} true if a child compilation had a warning
	 */
	hasWarnings() {
		return this.stats.some(stat => stat.hasWarnings());
	}

	toJson(options, forToString) {
		if (this.stats.length === 1) {
			return this.stats[0].toJson(options, forToString);
		}

		if (typeof options === "boolean" || typeof options === "string") {
			options = Stats.presetToOptions(options);
		} else if (!options) {
			options = {};
		}
		const jsons = this.stats.map((stat, idx) => {
			const childOptions = Stats.getChildOptions(options, idx);
			const obj = stat.toJson(childOptions, forToString);
			obj.name = stat.compilation && stat.compilation.name;
			return obj;
		});
		const showVersion =
			options.version === undefined
				? jsons.every(j => j.version)
				: options.version !== false;
		const showHash =
			options.hash === undefined
				? jsons.every(j => j.hash)
				: options.hash !== false;
		if (showVersion) {
			for (const j of jsons) {
				delete j.version;
			}
		}
		const obj = {
			errors: jsons.reduce((arr, j) => {
				return arr.concat(
					j.errors.map(msg => {
						return `(${j.name}) ${msg}`;
					})
				);
			}, []),
			warnings: jsons.reduce((arr, j) => {
				return arr.concat(
					j.warnings.map(msg => {
						return `(${j.name}) ${msg}`;
					})
				);
			}, [])
		};
		if (showVersion) obj.version = require("../package.json").version;
		if (showHash) obj.hash = this.hash;
		if (options.children !== false) obj.children = jsons;
		return obj;
	}

	toString(options) {
		if (this.stats.length === 1) {
			return this.stats[0].toString(options);
		}

		if (typeof options === "boolean" || typeof options === "string") {
			options = Stats.presetToOptions(options);
		} else if (!options) {
			options = {};
		}

		const useColors = optionOrFallback(options.colors, false);
		const obj = this.toJson(options, true);

		return Stats.jsonToString(obj, useColors);
	}
}

module.exports = MultiStats;
