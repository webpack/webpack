/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");
const ModuleDependencyTemplateAsRequireId = require("./ModuleDependencyTemplateAsRequireId");

/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("./ContextDependency").ContextDependencyOptions} ContextDependencyOptions */
/** @typedef {import("../util/globUtils").ResolvedContextModuleGlobPattern} ResolvedContextModuleGlobPattern */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[ImportMetaContextDependencyKindValue]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[ImportMetaContextDependencyKindValue]>} ObjectSerializerContext */

/** @enum {string} */
const ImportMetaContextDependencyKind = {
	WEBPACK_CONTEXT: "webpack-context",
	GLOB: "glob"
};

/** @typedef {typeof ImportMetaContextDependencyKind[keyof typeof ImportMetaContextDependencyKind]} ImportMetaContextDependencyKindValue */

/**
 * @typedef {object} ImportMetaGlobDependencyOptions
 * @property {string[]} globPatterns glob patterns
 * @property {ResolvedContextModuleGlobPattern[]} resolvedGlobPatterns resolved glob patterns
 * @property {string} context context
 * @property {string} baseDir base directory
 * @property {boolean} recursive recursive
 * @property {ContextDependencyOptions["mode"]} mode mode
 * @property {string | undefined} globImport glob import
 * @property {string} globQuery glob query
 * @property {boolean} globExhaustive glob exhaustive
 * @property {ContextDependencyOptions["referencedExports"]} referencedExports referenced exports
 * @property {Range} range range
 */

class ImportMetaContextDependency extends ContextDependency {
	/**
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 * @param {ImportMetaContextDependencyKindValue=} kind dependency kind
	 */
	constructor(
		options,
		range,
		kind = ImportMetaContextDependencyKind.WEBPACK_CONTEXT
	) {
		super(options);

		this.range = range;
		/** @type {ImportMetaContextDependencyKindValue} */
		this.kind = kind;
	}

	/**
	 * Returns a request context.
	 * @returns {string | undefined} a request context
	 */
	getContext() {
		const globContext =
			this.options &&
			/** @type {{ globContext?: string }} */ (this.options).globContext;
		if (globContext) return globContext;
		return super.getContext();
	}

	/**
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 * @returns {ImportMetaContextDependency} dependency
	 */
	static webpackContext(options, range) {
		return new ImportMetaContextDependency(
			options,
			range,
			ImportMetaContextDependencyKind.WEBPACK_CONTEXT
		);
	}

	/**
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 * @returns {ImportMetaContextDependency} dependency
	 */
	static glob(options, range) {
		return new ImportMetaContextDependency(
			options,
			range,
			ImportMetaContextDependencyKind.GLOB
		);
	}

	get category() {
		return "esm";
	}

	get type() {
		switch (this.kind) {
			case ImportMetaContextDependencyKind.GLOB:
				return `import.meta.glob ${this.options.mode}`;
			case ImportMetaContextDependencyKind.WEBPACK_CONTEXT:
			default:
				return `import.meta.webpackContext ${this.options.mode}`;
		}
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		switch (this.kind) {
			case ImportMetaContextDependencyKind.GLOB: {
				const { options } = this;
				return (
					`context${this.getContext() || ""}|glob request${options.request} ` +
					`${options.recursive} ${(options.globPatterns || []).join(",")} ` +
					`${options.mode}${options.globExhaustive ? " globExhaustive" : ""}` +
					`${options.globImport ? ` globImport:${options.globImport}` : ""}` +
					`${
						options.referencedExports
							? ` referencedExports:${JSON.stringify(options.referencedExports)}`
							: ""
					}`
				);
			}
			case ImportMetaContextDependencyKind.WEBPACK_CONTEXT:
			default:
				return super.getResourceIdentifier();
		}
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.kind);

		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.kind = context.read();

		super.deserialize(context.rest);
	}
}

makeSerializable(
	ImportMetaContextDependency,
	"webpack/lib/dependencies/ImportMetaContextDependency"
);

ImportMetaContextDependency.Template = ModuleDependencyTemplateAsRequireId;
ImportMetaContextDependency.Kind = ImportMetaContextDependencyKind;

module.exports = ImportMetaContextDependency;
