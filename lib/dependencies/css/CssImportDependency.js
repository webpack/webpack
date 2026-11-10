/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const ModuleDependency = require("../core/ModuleDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import { CssParserExportType } from "../../../declarations/WebpackOptions" */
/** @import Dependency, { DependencyKinds } from "../../graph/Dependency" */
/**
 * @import {
 * 	CssDependencyTemplateContext as DependencyTemplateContext
 * } from "../../template/DependencyTemplate"
 */
/** @import { Inheritance } from "../../css/CssModule" */
/** @import Module from "../../module/Module" */
/** @import { Range } from "../../css/CssParser" */
/** @import { ComplexSerializableType } from "../../serialization/types" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../../serialization/ObjectMiddleware"
 */

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
	 * @param {boolean} concatenateCommonJsModules whether optimization.concatenateModules.commonjs is enabled
	 * @param {Module | null=} module the module this dependency resolved to
	 * @returns {boolean} true if this dependency can be concatenated
	 */
	canConcatenate(concatenateCommonJsModules, module) {
		// Only a stylesheet target is hoisted; hoisting any other would evaluate it.
		return Boolean(module) && /** @type {Module} */ (module).is("css");
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
		// This class reads its fields before its base class does.
		const c0 =
			/** @type {ObjectDeserializerContext<[CssImportDependency["range"], CssImportDependency["mode"], CssImportDependency["layer"], CssImportDependency["supports"], CssImportDependency["media"], CssImportDependency["inheritance"], CssImportDependency["exportType"], ...ComplexSerializableType[]]>} */
			(context);
		this.range = c0.read();
		const c1 = c0.rest;
		this.mode = c1.read();
		const c2 = c1.rest;
		this.layer = c2.read();
		const c3 = c2.rest;
		this.supports = c3.read();
		const c4 = c3.rest;
		this.media = c4.read();
		const c5 = c4.rest;
		this.inheritance = c5.read();
		const c6 = c5.rest;
		this.exportType = c6.read();
		const c7 = c6.rest;
		super.deserialize(c7);
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

makeSerializable(CssImportDependency, [
	"webpack/lib/dependencies/css/CssImportDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/CssImportDependency"
]);

/** @type {Set<keyof DependencyKinds>} */
CssImportDependency.KINDS = new Set([...ModuleDependency.KINDS, "css-import"]);

module.exports = CssImportDependency;
