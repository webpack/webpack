/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author webpack contributors
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class HtmlLinkDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {Range} range range of the href attribute value
	 * @param {object} attributes link tag attributes
	 * @param {string=} attributes.rel the rel attribute (stylesheet, icon, etc.)
	 * @param {string=} attributes.type the type attribute
	 */
	constructor(request, range, attributes = {}) {
		super(request);
		this.range = range;
		this.linkAttributes = attributes;
	}

	get type() {
		return "html link";
	}

	get category() {
		return this.linkAttributes.rel === "stylesheet" ? "css-import" : "url";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.linkAttributes);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.linkAttributes = read();
		super.deserialize(context);
	}
}

HtmlLinkDependency.Template = class HtmlLinkDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ moduleGraph, chunkGraph, runtime, codeGenerationResults }
	) {
		const dep = /** @type {HtmlLinkDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));
		if (!module) return;

		let filename;

		if (dep.linkAttributes.rel === "stylesheet") {
			// For CSS, get the chunk's CSS file
			const chunks = chunkGraph.getModuleChunksIterable(module);
			for (const chunk of chunks) {
				if (chunk.files.size > 0) {
					for (const file of chunk.files) {
						if (file.endsWith(".css")) {
							filename = file;
							break;
						}
					}
					if (!filename) {
						filename = [...chunk.files][0];
					}
				}
				if (filename) break;
			}
		} else {
			// For other links (icons, etc.), resolve as asset
			const codeGen = codeGenerationResults.get(module, runtime);
			const data = codeGen.data;
			if (data) {
				const url = data.get("url");
				filename = url
					? url["css-url"] || url.toString()
					: data.get("filename") || "";
			}
		}

		if (filename) {
			source.replace(dep.range[0], dep.range[1] - 1, filename);
		}
	}
};

makeSerializable(
	HtmlLinkDependency,
	"webpack/lib/dependencies/HtmlLinkDependency"
);

module.exports = HtmlLinkDependency;
