"use strict";

const { DefinePlugin } = require("../../../../");

let unparsedCalls = 0;

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		noParse: /unparsed\.js$/,
		rules: [
			{ test: /ast\.js$/, use: require.resolve("./ast-loader") },
			{ test: /parsed\.js$/, parser: { parse: require("./custom-parse") } }
		]
	},
	plugins: [
		new DefinePlugin({
			ESCAPED_VALUE: DefinePlugin.runtimeValue(async () => 42),
			AST_VALUE: DefinePlugin.runtimeValue(async () => 42),
			PARSE_VALUE: DefinePlugin.runtimeValue(async () => 42),
			ALIAS_VALUE: "INDIRECT_VALUE",
			INDIRECT_VALUE: DefinePlugin.runtimeValue(async () => 42),
			GENERATED_VALUE: DefinePlugin.runtimeValue(async () => "INDIRECT_VALUE"),
			SYNC_GENERATED_VALUE: DefinePlugin.runtimeValue(() => "INDIRECT_VALUE"),
			SETTINGS: {
				used: 42,
				unused: DefinePlugin.runtimeValue(async () => {
					throw new Error("An unused definition must not fail the build");
				})
			},
			HAS_SOURCE: DefinePlugin.runtimeValue(
				async ({ module }) => module.originalSource() !== null
			),
			UNPARSED_VALUE: DefinePlugin.runtimeValue(async ({ module }) => {
				if (module.resource.endsWith("unparsed.js")) unparsedCalls++;
				return 42;
			}),
			MERGED: {},
			"MERGED.value": DefinePlugin.runtimeValue(async ({ key }) =>
				JSON.stringify(key)
			)
		}),
		(compiler) => {
			compiler.hooks.done.tap("CheckUnparsedModules", () => {
				expect(unparsedCalls).toBe(0);
			});
		}
	]
};
