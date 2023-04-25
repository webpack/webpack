/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Krasnoyarov @alexander-akait
*/

"use strict";

const NormalModule = require("./NormalModule");

/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./Module")} Module */

class CssModule extends NormalModule {
	constructor(args) {
		super(args);

		// Avoid override `layer` for `Module` class, because it is a feature to run module in specific layer
		this.csslayer = args.layer;
		this.supports = args.supports;
		this.media = args.media;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		let identifier = super.identifier();

		if (this.csslayer) {
			identifier += `|${this.csslayer}`;
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
			this.csslayer ? ` (layer ${this.csslayer})` : ""
		}${this.supports ? ` (supports ${this.supports})` : ""}${
			this.media ? ` (media ${this.media})` : ""
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
		this.csslayer = m.csslayer;
		this.supports = m.supports;
		this.media = m.media;
	}

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
			resolveOptions: null
		});
		obj.deserialize(context);
		return obj;
	}

	deserialize(context) {
		const { read } = context;
		this.csslayer = read();
		this.supports = read();
		this.media = read();
		super.deserialize(context);
	}
}

module.exports = CssModule;
