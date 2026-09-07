"use strict";

const webpack = require("../../../../");
const makeSerializable = require("../../../../lib/util/makeSerializable");

/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../../../../lib/serialization/ObjectMiddleware"
 */

const { NullDependency } = webpack.dependencies;

/** @typedef {{ isLazy: boolean, getLazyUntil: string, getLazyName: string, setLazy: boolean }} LazyFlags */

// A dependency type of webpack's own spells these as methods; a foreign one may
// spell the same names as plain flags, which no lazy-barrel walk must call.
class LazyFlagDependency extends NullDependency {
	constructor() {
		super();
		const flags = /** @type {LazyFlags} */ (/** @type {unknown} */ (this));
		flags.isLazy = true;
		flags.getLazyUntil = "id";
		flags.getLazyName = "value";
		flags.setLazy = true;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const flags = /** @type {LazyFlags} */ (/** @type {unknown} */ (this));
		context.write(flags.isLazy);
		context.write(flags.getLazyUntil);
		context.write(flags.getLazyName);
		context.write(flags.setLazy);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const flags = /** @type {LazyFlags} */ (/** @type {unknown} */ (this));
		flags.isLazy = /** @type {boolean} */ (context.read());
		flags.getLazyUntil = /** @type {string} */ (context.read());
		flags.getLazyName = /** @type {string} */ (context.read());
		flags.setLazy = /** @type {boolean} */ (context.read());
		super.deserialize(context);
	}
}

makeSerializable(
	LazyFlagDependency,
	"test/configCases/lazy-barrel/custom-dependency-lazy-flag/webpack.config.js",
	"LazyFlagDependency"
);

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	optimization: {
		sideEffects: true,
		providedExports: true,
		usedExports: true,
		moduleIds: "named",
		minimize: false,
		concatenateModules: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.dependencyTemplates.set(
					LazyFlagDependency,
					new NullDependency.Template()
				);
				compilation.hooks.succeedModule.tap("Test", (module) => {
					if (/lib[/\\]index\.js$/.test(module.identifier())) {
						module.addDependency(new LazyFlagDependency());
					}
				});
			});
		}
	]
};
