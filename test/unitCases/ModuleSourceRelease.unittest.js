"use strict";

require("../helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");

/** @typedef {import("../../").NormalModule} NormalModule */

const CONTEXT = path.join(__dirname, "..", "fixtures");

/** @typedef {{ name: string, string: boolean, buffer: boolean, text: string }} Reading */

/**
 * Which cached forms of its content a module's source holds, plus the text it
 * serves. Both form fields are webpack-sources internals, read never written.
 * @param {NormalModule} module the built module
 * @returns {Reading} what the source holds right now
 */
const read = (module) => {
	const source =
		/** @type {import("webpack-sources").Source & { _value?: unknown, _valueAsString?: unknown, _valueAsBuffer?: unknown }} */
		(module.originalSource());
	return {
		name: path.basename(module.identifier()),
		string:
			typeof source._valueAsString === "string" ||
			typeof source._value === "string",
		buffer:
			Buffer.isBuffer(source._valueAsBuffer) || Buffer.isBuffer(source._value),
		text: source.source().toString()
	};
};

/**
 * Runs one compilation and reports what each module's source held the moment
 * the graph was finished — the point the release is about, since rendering
 * reads a source's bytes again afterwards.
 * @param {import("../../").Configuration} options webpack options
 * @returns {Promise<Map<string, Reading>>} one reading per module, by resource
 */
const readingsAtFinishModules = (options) =>
	new Promise((resolve, reject) => {
		const webpack = require("../..");

		/** @type {Map<string, Reading>} */
		const readings = new Map();
		const compiler = webpack({
			mode: "production",
			context: CONTEXT,
			entry: "./main1.js",
			optimization: { minimize: false },
			...options
		});
		compiler.outputFileSystem =
			/** @type {import("../../").OutputFileSystem} */
			(/** @type {unknown} */ (createFsFromVolume(new Volume())));
		compiler.hooks.compilation.tap("ModuleSourceRelease", (compilation) => {
			compilation.hooks.finishModules.tap("ModuleSourceRelease", (modules) => {
				for (const module of modules) {
					const normalModule = /** @type {NormalModule} */ (module);
					if (normalModule.originalSource() === null) continue;
					readings.set(normalModule.resource, read(normalModule));
				}
			});
		});
		compiler.run((err, stats) => {
			if (err) return reject(err);
			if (!stats) return reject(new Error("no stats"));
			if (stats.hasErrors()) {
				return reject(new Error(stats.toString({ errors: true })));
			}
			compiler.close((closeError) =>
				closeError ? reject(closeError) : resolve(readings)
			);
		});
	});

describe("module source release", () => {
	it("leaves one cached form per source when no source map is built", async () => {
		const readings = await readingsAtFinishModules({ devtool: false });
		expect(readings.size).toBeGreaterThan(0);
		for (const [, reading] of readings) {
			expect({
				name: reading.name,
				string: reading.string,
				buffer: reading.buffer
			}).toEqual({ name: reading.name, string: true, buffer: false });
		}
	});

	it("still serves each source's text after releasing the other form", async () => {
		const readings = await readingsAtFinishModules({ devtool: false });
		for (const [resource, reading] of readings) {
			expect(reading.text).toBe(fs.readFileSync(resource, "utf8"));
		}
	});

	it("keeps the string a map-carrying source's generator reads back", async () => {
		const readings = await readingsAtFinishModules({ devtool: "source-map" });
		expect(readings.size).toBeGreaterThan(0);
		for (const [, reading] of readings) {
			expect({ name: reading.name, string: reading.string }).toEqual({
				name: reading.name,
				string: true
			});
		}
	});
});
