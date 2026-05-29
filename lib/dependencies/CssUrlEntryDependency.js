/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

// Re-references a `.css` resource as a regular `link` CSS module so it lands in
// its own chunk; the `url` export module reads that chunk's filename. Category
// is `css-import` (not `url`) so it skips the asset rules under `dependency: "url"`.
class CssUrlEntryDependency extends ModuleDependency {
	get type() {
		return "new URL() for CSS";
	}

	get category() {
		return "css-import";
	}
}

makeSerializable(
	CssUrlEntryDependency,
	"webpack/lib/dependencies/CssUrlEntryDependency"
);

module.exports = CssUrlEntryDependency;
