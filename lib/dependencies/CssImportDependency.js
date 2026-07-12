/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions.js").CssParserExportType} CssParserExportType */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../DependencyTemplate.js").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../css/CssModule.js").Inheritance} Inheritance */
/** @typedef {import("../css/CssParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext} ObjectSerializerContext */

class CssImportDependency extends ModuleDependency {
	/**
	 * Example of dependency:
	 * \@import url("landscape.css") layer(forms) screen and (orientation: landscape) screen and (orientation: landscape);
	 * @param {string} request request
	 * @param {Range} range range of the argument
	 * @param {"local" | "global"=} mode mode of the parsed CSS
	 * @param {string=} layer layer
	 * @param {string=} supports list of supports conditions
	 * @param {string=} media list of media conditions
	 * @param {Inheritance=} inheritance layer/supports/media chain inherited from the importing module
	 * @param {CssParserExportType=} exportType exportType inherited from the importing module
	 */
	constructor(
		request,
		range,
		mode,
		layer,
		supports,
		media,
		inheritance,
		exportType
	) {
		super(request);
		this.range = range;
		this.mode = mode;
		/** @type {string | undefined} */
		this.layer = layer;
		/** @type {string | undefined} */
		this.supports = supports;
		/** @type {string | undefined} */
		this.media = media;
		/** @type {Inheritance | undefined} */
		this.inheritance = inheritance;
		/** @type {CssParserExportType | undefined} */
		this.exportType = exportType;
	}

	get type() {
		return "css @import";
	}

	get category() {
		return `css-import${this.mode ? `-${this.mode}-module` : ""}`;
	}

	/**
	 * Returns true if this dependency can be concatenated
	 * @returns {boolean} true if this dependency can be concatenated
	 */
	canConcatenate() {
		return true;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		let str = `context${this._context || ""}|module${this.request}`;

		if (this.mode) {
			str += `|mode${this.mode}`;
		}

		if (this.layer) {
			str += `|layer${this.layer}`;
		}

		if (this.supports) {
			str += `|supports${this.supports}`;
		}

		if (this.media) {
			str += `|media${this.media}`;
		}

		return str;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.mode);
		write(this.layer);
		write(this.supports);
		write(this.media);
		write(this.inheritance);
		write(this.exportType);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.mode = read();
		this.layer = read();
		this.supports = read();
		this.media = read();
		this.inheritance = read();
		this.exportType = read();
		super.deserialize(context);
	}
}

CssImportDependency.Template = class CssImportDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		if (templateContext.type === "javascript") return;
		const dep = /** @type {CssImportDependency} */ (dependency);

		source.replace(dep.range[0], dep.range[1] - 1, "");
	}
};

makeSerializable(
	CssImportDependency,
	"webpack/lib/dependencies/CssImportDependency"
);

export default CssImportDependency;

export { CssImportDependency as "module.exports" };
