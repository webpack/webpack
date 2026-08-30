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

		const lines = bundle.split("\n");
		const consumer = new SourceMapConsumer(map);

		for (const [name, token] of [
			["chained.js", "BOM_CHAINED_TOKEN"],
			["direct.js", "BOM_DIRECT_TOKEN"]
		]) {
			const source = map.sources.find((entry) => entry.endsWith(name));

			expect(source).toBeDefined();

			const original = map.sourcesContent[map.sources.indexOf(source)];

			expect(original.startsWith(BOM)).toBe(false);

			const declaration = `= "${token}";`;
			const line = lines.findIndex((text) => text.includes(declaration)) + 1;

			expect(line).toBeGreaterThan(0);

			const text = lines[line - 1];
			const start = text.indexOf("const ");
			const quote = text.indexOf(`"${token}"`);

			// The BOM is gone from the content, so the map must not count it any
			// more: both segments of the module's first line point at the columns
			// the code really occupies.
			expect(
				consumer.generatedPositionFor({ source, line: 1, column: 0 })
			).toMatchObject({ line, column: start });
			expect(
				consumer.generatedPositionFor({
					source,
					line: 1,
					column: original.indexOf('"')
				})
			).toMatchObject({ line, column: quote });
			expect(
				consumer.originalPositionFor({ line, column: start })
			).toMatchObject({ source, line: 1, column: 0 });

			// Only the first line moves - the BOM is on that line alone.
			expect(
				consumer.generatedPositionFor({ source, line: 2, column: 0 })
			).toMatchObject({ column: 0 });
		}
	}
};
