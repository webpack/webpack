/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../DependencyTemplate").CssData} CssData */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../NormalModule").NormalModuleBuildInfo} NormalModuleBuildInfo */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[CssLayer, Supports, Media, Inheritance | undefined, CssParserExportType | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[CssLayer, Supports, Media, Inheritance | undefined, CssParserExportType | undefined]>} ObjectSerializerContext */
/** @typedef {import("../../declarations/WebpackOptions").CssParserExportType} CssParserExportType */

/** @typedef {string | undefined} CssLayer */
/** @typedef {string | undefined} Supports */
/** @typedef {string | undefined} Media */
/** @typedef {[CssLayer, Supports, Media]} InheritanceItem */
/** @typedef {InheritanceItem[]} Inheritance */

/** @typedef {NormalModuleCreateData & { cssLayer: CssLayer, supports: Supports, media: Media, inheritance?: Inheritance, exportType?: CssParserExportType }} CssModuleCreateData */

/**
 * Defines the build info properties specific to css modules.
 * @typedef {object} KnownCssModuleBuildInfo
 * @property {CssData=} cssData
 * @property {string=} charset charset at-rule
 */

/** @typedef {NormalModuleBuildInfo & KnownCssModuleBuildInfo} CssModuleBuildInfo */

/**
 * Defines the build meta properties specific to css modules.
 * @typedef {object} KnownCssModuleBuildMeta
 * @property {boolean=} isCssModule
 * @property {boolean=} needIdInConcatenation
 */

/** @typedef {BuildMeta & KnownCssModuleBuildMeta} CssModuleBuildMeta */

class CssModule extends NormalModule {
	/**
	 * Creates an instance of CssModule.
	 * @param {CssModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);

		// Redeclared with the css specific shape
		/** @type {CssModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
		/** @type {CssModuleBuildMeta | undefined} */
		this.buildMeta = undefined;

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
			// Append directly — same bytes as `|` + items.join("|"), without the
			// intermediate `.map()` array + per-item strings (`identifier()` is
			// uncached and called repeatedly per module).
			for (let i = 0; i < this.inheritance.length; i++) {
				const item = this.inheritance[i];
				identifier += `|inheritance_${i}|${item[0] || ""}|${item[1] || ""}|${item[2] || ""}`;
			}
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
		context
			.write(this.cssLayer)
			.write(this.supports)
			.write(this.media)
			.write(this.inheritance)
			.write(this.exportType);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 * @returns {CssModule} the deserialized object
	 */
	static deserialize(context) {
		const obj = new CssModule({
			// will be deserialized by Module
			layer: /** @type {EXPECTED_ANY} */ (null),
			type: "",
			// will be filled by updateCacheModule
			resource: "",
			context: "",
			request: /** @type {EXPECTED_ANY} */ (null),
			userRequest: /** @type {EXPECTED_ANY} */ (null),
			rawRequest: /** @type {EXPECTED_ANY} */ (null),
			loaders: /** @type {EXPECTED_ANY} */ (null),
			matchResource: /** @type {EXPECTED_ANY} */ (null),
			parser: /** @type {EXPECTED_ANY} */ (null),
			parserOptions: /** @type {EXPECTED_ANY} */ (null),
			generator: /** @type {EXPECTED_ANY} */ (null),
			generatorOptions: /** @type {EXPECTED_ANY} */ (null),
			resolveOptions: /** @type {EXPECTED_ANY} */ (null),
			cssLayer: /** @type {EXPECTED_ANY} */ (null),
			supports: /** @type {EXPECTED_ANY} */ (null),
			media: /** @type {EXPECTED_ANY} */ (null),
			inheritance: /** @type {EXPECTED_ANY} */ (null),
			extractSourceMap: /** @type {EXPECTED_ANY} */ (null),
			exportType: /** @type {EXPECTED_ANY} */ (null)
		});
		obj.deserialize(context);
		return obj;
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.cssLayer = context.read();
		const c1 = context.rest;
		this.supports = c1.read();
		const c2 = c1.rest;
		this.media = c2.read();
		const c3 = c2.rest;
		this.inheritance = c3.read();
		const c4 = c3.rest;
		this.exportType = c4.read();
		super.deserialize(c4.rest);
	}
}

makeSerializable(CssModule, "webpack/lib/CssModule");

module.exports = CssModule;
