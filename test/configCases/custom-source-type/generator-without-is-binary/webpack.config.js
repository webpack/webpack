"use strict";

const { RawSource } = require("webpack-sources");
const { RuntimeGlobals } = require("../../../../");

const TYPES = new Set(["javascript"]);

/** @typedef {import("../../../../").Generator} Generator */

// A plugin's generator that implements the interface without extending
// `Generator`, so it has no `isBinary`: the rule's `binary` option still decides.
/** @type {Generator} */
const duckGenerator = /** @type {Generator} */ (
	/** @type {unknown} */ ({
		getTypes: () => TYPES,
		getSize: () => 42,
		getTypesDependOnIncomingConnections: () => false,
		getConcatenationBailoutReason: () => "duck",
		updateHash: () => {},
		generate: (
			/** @type {import("../../../../").NormalModule} */ module,
			/** @type {{ runtimeRequirements: Set<string> }} */ {
				runtimeRequirements
			}
		) => {
			runtimeRequirements.add(RuntimeGlobals.module);
			return new RawSource(
				`module.exports = ${JSON.stringify(
					Buffer.isBuffer(
						/** @type {import("webpack-sources").Source} */ (
							module.originalSource()
						).source()
					)
				)};`
			);
		}
	})
);

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{ test: /file\.duck$/, type: "duck", generator: { binary: true } },
			{ test: /other\.duck$/, type: "duck" }
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"DuckPlugin",
				(compilation, { normalModuleFactory }) => {
					normalModuleFactory.hooks.createParser
						.for("duck")
						.tap("DuckPlugin", () => ({ parse: (source, state) => state }));
					normalModuleFactory.hooks.createGenerator
						.for("duck")
						.tap("DuckPlugin", () => duckGenerator);
				}
			);
		}
	]
};
