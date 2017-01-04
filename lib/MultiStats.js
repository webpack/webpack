"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const Stats = require("./Stats");
class MultiStats {
	constructor(stats) {
		this.stats = stats;
		this.hash = stats.map(stat => stat.hash).join("");
	}

	hasErrors() {
		return this.stats
			.map(stat => stat.hasErrors())
			.reduce((a, b) => a || b, false);
	}

	hasWarnings() {
		return this.stats
			.map(stat => stat.hasWarnings())
			.reduce((a, b) => a || b, false);
	}

	toJson(options, forToString) {
		const jsons = this.stats.map(stat => {
			const obj = stat.toJson(options, forToString);
			obj.name = stat.compilation && stat.compilation.name;
			return obj;
		});
		const obj = {
			errors: jsons.reduce((arr, j) => arr.concat(j.errors.map((msg) => `(${j.name}) ${msg}`)), []),
			warnings: jsons.reduce((arr, j) => arr.concat(j.warnings.map((msg) => `(${j.name}) ${msg}`)), [])
		};
		if(!options || options.version !== false) {
			obj.version = require("../package.json").version;
		}
		if(!options || options.hash !== false) {
			obj.hash = this.hash;
		}
		if(!options || options.children !== false) {
			obj.children = jsons;
		}
		return obj;
	}
}
MultiStats.prototype.toString = Stats.prototype.toString;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MultiStats;
