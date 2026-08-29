"use strict";

const fs = require("fs");
const path = require("path");
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive via webpack-sources, used only to verify the emitted map
const { SourceMapConsumer } = require("source-map");

const BOM = "\uFEFF";

module.exports = {
	afterExecute(options) {
		const dir = options.output.path;
		const bundle = fs.readFileSync(path.join(dir, "bundle0.js"), "utf8");
		const map = JSON.parse(
			fs.readFileSync(path.join(dir, "bundle0.js.map"), "utf8")
		);

		expect(bundle.startsWith(BOM)).toBe(false);
		expect(map.version).toBe(3);

		const source = map.sources.find((name) => /mod\.js$/.test(name));

		expect(source).toBeDefined();

		// The BOM must not survive into what a debugger shows as the original file.
		const original = map.sourcesContent[map.sources.indexOf(source)];

		expect(original.startsWith(BOM)).toBe(false);
		expect(original).toContain('const VALUE = "BOM_SOURCE_MAP_TOKEN";');

		// Stripping the BOM must not shift the mappings: the first line of the
		// module has to point at the column the module's code actually starts on.
		const lines = bundle.split("\n");
		const line =
			lines.findIndex((text) =>
				text.includes('const VALUE = "BOM_SOURCE_MAP_TOKEN";')
			) + 1;

		expect(line).toBeGreaterThan(0);

		const consumer = new SourceMapConsumer(map);

		expect(
			consumer.generatedPositionFor({ source, line: 1, column: 0 })
		).toMatchObject({
			line,
			column: lines[line - 1].indexOf("const VALUE")
		});
	}
};
