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

/** @typedef {NormalModuleCreateData & { cssLayer: string|undefined|null, supports: string|undefined|null, media: string|undefined|null }} CSSModuleCreateData */

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

		return identifier;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		const readableIdentifier = super.readableIdentifier(requestShortener);

		return `css ${readableIdentifier}${
			this.cssLayer ? ` (layer ${this.cssLayer || ""})` : ""
		}${this.supports ? ` (supports ${this.supports || ""})` : ""}${
			this.media ? ` (media ${this.media || ""})` : ""
		}`;
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
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.cssLayer);
		write(this.supports);
		write(this.media);
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
			media: null
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
		super.deserialize(context);
	}
}

makeSerializable(CssModule, "webpack/lib/CssModule");

module.exports = CssModule;
