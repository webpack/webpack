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

// A dependency type of webpack's own spells `isLazy` as a method; a foreign one may
// spell the same name as a plain flag, which the lazy-barrel walk must not call.
class LazyFlagDependency extends NullDependency {
	constructor() {
		super();
		/** @type {{ isLazy: boolean }} */ (/** @type {unknown} */ (this)).isLazy =
			true;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.isLazy);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		/** @type {{ isLazy: boolean }} */ (/** @type {unknown} */ (this)).isLazy =
			/** @type {boolean} */ (context.read());
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
