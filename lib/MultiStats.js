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
		const version = children.every(o => o.version);
		const hash = children.every(o => o.hash);
		if (version) {
			for (const o of children) {
				o.version = false;
			}
		}
		return {
			version,
			hash,
			children
		};
	}

	toJson(options) {
		options = this._createChildOptions(options, { forToString: false });
		const obj = {};
		obj.children = this.stats.map((stat, idx) => {
			return stat.toJson(options.children[idx]);
		});
		if (options.version) {
			obj.version = require("../package.json").version;
		}
		if (options.hash) {
			obj.hash = this.hash;
		}
		const jsons = this.stats.map((stat, idx) => {
			const childOptions = Array.isArray(options) ? options[idx] : options;
			const obj = stat.toJson(childOptions);
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
		obj.errors = [];
		obj.warnings = [];
		for (const j of jsons) {
			const mapError = obj => {
				return {
					...obj,
					compilerPath: obj.compilerPath
						? `${j.name}.${obj.compilerPath}`
						: j.name
				};
			};
			if (j.errors) {
				obj.errors.push(...j.errors.map(mapError));
			}
			if (j.warnings) {
				obj.warnings.push(...j.warnings.map(mapError));
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
			const content = indent(str, "    ");
			return name ? `Child ${name}:\n${content}` : `Child\n${content}`;
		});
		if (options.version) {
			results.unshift(`Version: webpack ${require("../package.json").version}`);
		}
		if (options.hash) {
			results.unshift(`Hash: ${this.hash}`);
		}
		return results.filter(Boolean).join("\n");
	}
}

module.exports = MultiStats;
