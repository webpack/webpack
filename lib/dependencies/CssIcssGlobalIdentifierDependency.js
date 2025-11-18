/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const CssIcssExportDependency = require("./CssIcssExportDependency");

/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */

class CssIcssGlobalIdentifierDependency extends CssIcssExportDependency {
	/**
	 * @param {string} name export identifier name
	 * @param {string} value identifier value
	 * @param {string | undefined} reexport reexport name
	 * @param {Range} range the range of dependency
	 */
	constructor(name, value, reexport, range) {
		super(name, value, reexport, range);
		this.exportMode = CssIcssExportDependency.EXPORT_MODE.APPEND;
	}

	get type() {
		return "css global identifier";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return undefined;
	}
}

CssIcssGlobalIdentifierDependency.Template = CssIcssExportDependency.Template;

makeSerializable(
	CssIcssGlobalIdentifierDependency,
	"webpack/lib/dependencies/CssIcssGlobalDependency"
);

module.exports = CssIcssGlobalIdentifierDependency;
