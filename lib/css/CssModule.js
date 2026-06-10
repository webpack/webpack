/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const NormalModule = require("../NormalModule");
const CssImportDependency = require("../dependencies/CssImportDependency");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("../NormalModuleFactory").ResolveData} ResolveData */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../../declarations/WebpackOptions").CssParserExportType} CssParserExportType */
/** @typedef {import("./CssParser")} CssParser */

/** @typedef {string | undefined} CssLayer */
/** @typedef {string | undefined} Supports */
/** @typedef {string | undefined} Media */
/** @typedef {[CssLayer, Supports, Media]} InheritanceItem */
/** @typedef {InheritanceItem[]} Inheritance */

/** @typedef {NormalModuleCreateData & { cssLayer?: CssLayer, supports?: Supports, media?: Media, inheritance?: Inheritance, exportType?: CssParserExportType }} CssModuleCreateData */

class CssModule extends NormalModule {
	/**
	 * Creates an instance of CssModule.
	 * @param {CssModuleCreateData} options options object
	 * @param {ResolveData=} resolveData resolve data, when created by the factory
	 */
	constructor(options, resolveData) {
		super(options);

		// Avoid override `layer` for `Module` class, because it is a feature to run module in specific layer
		/** @type {CssModuleCreateData['cssLayer']} */
		this.cssLayer = options.cssLayer;
		/** @type {CssModuleCreateData['supports']} */
		this.supports = options.supports;
		/** @type {CssModuleCreateData['media']} */
		this.media = options.media;
		/** @type {CssModuleCreateData['inheritance']} */
		this.inheritance = options.inheritance;
		/** @type {CssModuleCreateData['exportType']} */
		this.exportType = options.exportType;

		if (resolveData) {
			this.exportType =
				/** @type {CssParser} */
				(options.parser).options.exportType;
			// When CSS is imported from CSS there is only one dependency
			const dependency =
				resolveData.dependencies.length > 0
					? resolveData.dependencies[0]
					: undefined;
			if (dependency instanceof CssImportDependency) {
				this.cssLayer = dependency.layer;
				this.supports = dependency.supports;
				this.media = dependency.media;
				this.inheritance = dependency.inheritance;
				if (dependency.exportType) this.exportType = dependency.exportType;
			}
		}
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		let identifier = super.identifier();

		if (this.cssLayer) {
			identifier += `|${this.cssLayer}`;
		}

		if (this.supports) {
			identifier += `|${this.supports}`;
		}

		if (this.media) {
			identifier += `|${this.media}`;
		}

		if (this.inheritance) {
			const inheritance = this.inheritance.map(
				(item, index) =>
					`inheritance_${index}|${item[0] || ""}|${item[1] || ""}|${
						item[2] || ""
					}`
			);

			identifier += `|${inheritance.join("|")}`;
		}

		if (this.exportType) {
			identifier += `|${this.exportType}`;
		}

		// We generate extra code for HMR, so we need to invalidate the module
		if (this.hot) {
			identifier += `|${this.hot}`;
		}

		return identifier;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		const readableIdentifier = super.readableIdentifier(requestShortener);

		let identifier = `css ${readableIdentifier}`;

		if (this.cssLayer) {
			identifier += ` (layer: ${this.cssLayer})`;
		}

		if (this.supports) {
			identifier += ` (supports: ${this.supports})`;
		}

		if (this.media) {
			identifier += ` (media: ${this.media})`;
		}

		if (this.exportType) {
			identifier += ` (exportType: ${this.exportType})`;
		}

		return identifier;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		const m = /** @type {CssModule} */ (module);
		this.cssLayer = m.cssLayer;
		this.supports = m.supports;
		this.media = m.media;
		this.inheritance = m.inheritance;
		this.exportType = m.exportType;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.cssLayer);
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
		this.cssLayer = read();
		this.supports = read();
		this.media = read();
		this.inheritance = read();
		this.exportType = read();
		super.deserialize(context);
	}
}

makeSerializable(CssModule, "webpack/lib/CssModule");

module.exports = CssModule;
