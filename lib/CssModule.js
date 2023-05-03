/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Krasnoyarov @alexander-akait
*/

"use strict";

const NormalModule = require("./NormalModule");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./Module")} Module */
/** @typedef {import("./NormalModule").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

/** @typedef {string|undefined} CssLayer */
/** @typedef {string|undefined} Supports */
/** @typedef {string|undefined} Media */
/** @typedef {[CssLayer?, Supports?, Media?]} InheritanceItem */
/** @typedef {Array<InheritanceItem>} Inheritance */

/** @typedef {NormalModuleCreateData & { cssLayer: CssLayer|null, supports: Supports|null, media: Media|null, inheritance: Inheritance|null }} CSSModuleCreateData */

class CssModule extends NormalModule {
	/**
	 * @param {CSSModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);

		// Avoid override `layer` for `Module` class, because it is a feature to run module in specific layer
		this.cssLayer = options.cssLayer;
		this.supports = options.supports;
		this.media = options.media;
		this.inheritance = options.inheritance;
	}

	/**
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

		return identifier;
	}

	/**
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
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.cssLayer);
		write(this.supports);
		write(this.media);
		write(this.inheritance);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 * @returns {CssModule} the deserialized object
	 */
	static deserialize(context) {
		const obj = new CssModule({
			// will be deserialized by Module
			layer: null,
			type: "",
			// will be filled by updateCacheModule
			resource: "",
			context: "",
			request: null,
			userRequest: null,
			rawRequest: null,
			loaders: null,
			matchResource: null,
			parser: null,
			parserOptions: null,
			generator: null,
			generatorOptions: null,
			resolveOptions: null,
			cssLayer: null,
			supports: null,
			media: null,
			inheritance: null
		});
		obj.deserialize(context);
		return obj;
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.cssLayer = read();
		this.supports = read();
		this.media = read();
		this.inheritance = read();
		super.deserialize(context);
	}
}

makeSerializable(CssModule, "webpack/lib/CssModule");

module.exports = CssModule;
