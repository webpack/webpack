/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const identifierUtils = require("./util/identifier");

/** @typedef {import("./Stats")} Stats */

const indent = (str, prefix) => {
	const rem = str.replace(/\n([^\n])/g, "\n" + prefix + "$1");
	return prefix + rem;
};

class MultiStats {
	/**
	 * @param {Stats[]} stats the child stats
	 */
	constructor(stats) {
		this.stats = stats;
	}

	get hash() {
		return this.stats.map(stat => stat.hash).join("");
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

	_createChildOptions(options, context) {
		if (!options) {
			options = {};
		}
		const { children: _, ...baseOptions } = options;
		const children = this.stats.map((stat, idx) => {
			const childOptions = Array.isArray(options.children)
				? options.children[idx]
				: options.children;
			return stat.compilation.createStatsOptions(
				{
					...baseOptions,
					...(childOptions && typeof childOptions === "object"
						? childOptions
						: { preset: childOptions })
				},
				context
			);
		});
		return {
			version: children.every(o => o.version),
			hash: children.every(o => o.hash),
			errorsCount: children.every(o => o.errorsCount),
			warningsCount: children.every(o => o.warningsCount),
			errors: children.every(o => o.errors),
			warnings: children.every(o => o.warnings),
			children
		};
	}

	toJson(options) {
		options = this._createChildOptions(options, { forToString: false });
		const obj = {};
		obj.children = this.stats.map((stat, idx) => {
			const obj = stat.toJson(options.children[idx]);
			const compilationName = stat.compilation.name;
			const name =
				compilationName &&
				identifierUtils.makePathsRelative(
					options.context,
					compilationName,
					stat.compilation.compiler.root
				);
			obj.name = name;
			return obj;
		});
		if (options.version) {
			obj.version = obj.children[0].version;
		}
		if (options.hash) {
			obj.hash = obj.children.map(j => j.hash).join("");
		}
		const mapError = (j, obj) => {
			return {
				...obj,
				compilerPath: obj.compilerPath
					? `${j.name}.${obj.compilerPath}`
					: j.name
			};
		};
		if (options.errors) {
			obj.errors = [];
			for (const j of obj.children) {
				for (const i of j.errors) {
					obj.errors.push(mapError(j, i));
				}
			}
		}
		if (options.warnings) {
			obj.warnings = [];
			for (const j of obj.children) {
				for (const i of j.warnings) {
					obj.warnings.push(mapError(j, i));
				}
			}
		}
		if (options.errorsCount) {
			obj.errorsCount = 0;
			for (const j of obj.children) {
				obj.errorsCount += j.errorsCount;
			}
		}
		if (options.warningsCount) {
			obj.warningsCount = 0;
			for (const j of obj.children) {
				obj.warningsCount += j.warningsCount;
			}
		}
		return obj;
	}

	toString(options) {
		options = this._createChildOptions(options, { forToString: true });
		const results = this.stats.map((stat, idx) => {
			const str = stat.toString(options.children[idx]);
			const compilationName = stat.compilation.name;
			const name =
				compilationName &&
				identifierUtils
					.makePathsRelative(
						options.context,
						compilationName,
						stat.compilation.compiler.root
					)
					.replace(/\|/g, " ");
			if (!str) return str;
			return name ? `${name}:\n${indent(str, "  ")}` : str;
		});
		return results.filter(Boolean).join("\n\n");
	}
}

module.exports = MultiStats;
