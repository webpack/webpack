/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("acorn").Node} Node **/
/** @typedef {import("../Dependency").DependencyTemplate} DependencyTemplate **/
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */

const NullDependency = require("./NullDependency");

class HarmonyExportHeaderDependency extends NullDependency {
	/**
	 * @param {Array<number>} range `range` in example below. From {@link Node.range}
	 * @param {Array<number>} rangeStatement `rangeStatement` in example below. From {@link Node.range}
	 * @example
	 * export default function (value) {}
	 *                ↑      range       ↑
	 *                └──────────────────┘
	 * ↑          rangeStatement         ↑
	 * └─────────────────────────────────┘
	 */
	constructor(range, rangeStatement) {
		super();
		this.range = range;
		this.rangeStatement = rangeStatement;
	}

	/**
	 * @override
	 */
	get type() {
		return "harmony export header";
	}
}

HarmonyExportHeaderDependency.Template = class HarmonyExportDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {HarmonyExportHeaderDependency} dep dependency
	 * @param {ReplaceSource} source source
	 * @returns {void}
	 */
	apply(dep, source) {
		const content = "";
		const replaceUntil = dep.range
			? dep.range[0] - 1
			: dep.rangeStatement[1] - 1;
		source.replace(dep.rangeStatement[0], replaceUntil, content);
	}
};

module.exports = HarmonyExportHeaderDependency;
