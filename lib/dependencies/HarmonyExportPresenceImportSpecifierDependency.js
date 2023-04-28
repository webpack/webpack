/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

/**
 * Dependency just for export presence import specifier.
 */
class HarmonyExportPresenceImportSpecifierDependency extends HarmonyImportSpecifierDependency {
	get type() {
		return "export presence harmony import specifier";
	}
}

makeSerializable(
	HarmonyExportPresenceImportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyExportPresenceImportSpecifierDependency"
);

HarmonyExportPresenceImportSpecifierDependency.Template =
	/** @type {any} can't cast to HarmonyImportSpecifierDependency.Template */ (
		NullDependency.Template
	);

module.exports = HarmonyExportPresenceImportSpecifierDependency;
