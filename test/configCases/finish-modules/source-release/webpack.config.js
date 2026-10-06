"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("webpack-sources").Source & { _value?: unknown, _valueAsString?: unknown, _valueAsBuffer?: unknown }} CachingSource */

const PLUGIN_NAME = "SourceReleaseTest";

/**
 * Asserts which cached forms of its content each module's source holds once the
 * graph is finished; the form fields are webpack-sources internals, only read.
 * @param {{ buffer: boolean | undefined }} expected whether a buffer is still held, undefined when either is fine
 * @returns {(compiler: Compiler) => void} the plugin
 */
const expectCachedForms = (expected) => (compiler) => {
	compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
		compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
			let checked = 0;
			for (const module of modules) {
				if (!(module instanceof webpack.NormalModule)) continue;
				const source = /** @type {CachingSource | null} */ (
					module.originalSource()
				);
				if (source === null) continue;
				checked++;
				const name = path.basename(module.resource);
				const string =
					typeof source._valueAsString === "string" ||
					typeof source._value === "string";
				const buffer =
					Buffer.isBuffer(source._valueAsBuffer) ||
					Buffer.isBuffer(source._value);
				/** @type {string[]} */
				const mismatches = [];
				// a module restored from the pack holds what was deserialized, so
				// only one built here shows what the release left
				if (compilation.builtModules.has(module)) {
					// the generator reads the string back, so it is the form kept
					if (!string) mismatches.push("holds no string");
					if (expected.buffer !== undefined && buffer !== expected.buffer) {
						mismatches.push(
							buffer ? "still holds a buffer" : "holds no buffer"
						);
					}
				}
				// read after the check, as reading may cache the other form again
				if (
					source.source().toString() !==
					fs.readFileSync(module.resource, "utf8")
				) {
					mismatches.push("serves other text than the file holds");
				}
				for (const mismatch of mismatches) {
					compilation.errors.push(
						new webpack.WebpackError(`${name}: the source ${mismatch}`)
					);
				}
			}
			if (checked === 0) {
				compilation.errors.push(new webpack.WebpackError("no source checked"));
			}
		});
	});
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		devtool: false,
		// without a source map one cached form of the content is enough
		plugins: [expectCachedForms({ buffer: false })]
	},
	{
		devtool: "source-map",
		plugins: [expectCachedForms({ buffer: undefined })]
	}
];
