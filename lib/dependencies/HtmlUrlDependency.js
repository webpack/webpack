/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Soumyaraj Bag @soumyarajbag - Webpack HTML Entry Points
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/**
 * @typedef {"script" | "link" | "url"} HtmlReferenceType
 * - "script"  : <script src="..."> — bundled as JS
 * - "link"    : <link href="...">  — bundled as CSS (or other asset)
 * - "url"     : <img src>, <source>, etc. — processed as asset/resource
 */

class HtmlUrlDependency extends ModuleDependency {
	/**
	 * @param {string} request URL request string (e.g. "./app.js")
	 * @param {Range} range  [start, end] byte positions of the value in the HTML source
	 * @param {HtmlReferenceType} referenceType  how this URL is used in the HTML
	 */
	constructor(request, range, referenceType) {
		super(request);
		this.range = range;
		this.referenceType = referenceType;
	}

	get type() {
		return "html url";
	}

	/**
	 * "url" → webpack's default rules route it to asset/resource.
	 * "script"/"link" → fall through to extension-based rules (js/css).
	 * @returns {string} dependency category
	 */
	get category() {
		if (this.referenceType === "url") return "url";
		return "commonjs";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.referenceType);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.referenceType = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HtmlUrlDependency,
	"webpack/lib/dependencies/HtmlUrlDependency"
);

module.exports = HtmlUrlDependency;
