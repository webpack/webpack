"use strict";

const fs = require("fs");
const path = require("path");
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive via webpack-sources, used only to verify the emitted map
const { SourceMapConsumer } = require("source-map");

const BOM = "\uFEFF";
const TOKEN = '"BOM_CSS_TOKEN"';

module.exports = {
	afterExecute(options) {
		const dir = options.output.path;
		const css = fs.readFileSync(path.join(dir, "bundle0.css"), "utf8");
		const map = JSON.parse(
			fs.readFileSync(path.join(dir, "bundle0.css.map"), "utf8")
		);

		expect(css.startsWith(BOM)).toBe(false);

		const source = map.sources.find((entry) => entry.endsWith("style.css"));

		expect(source).toBeDefined();

		const original = map.sourcesContent[map.sources.indexOf(source)];

		expect(original.startsWith(BOM)).toBe(false);

		const lines = css.split("\n");
		const line = lines.findIndex((text) => text.includes(TOKEN)) + 1;

		expect(line).toBeGreaterThan(0);

		// The extracted stylesheet lost its BOM, so its map must not count one:
		// both segments of the first line point at the columns the rule occupies.
		const consumer = new SourceMapConsumer(map);

		expect(
			consumer.generatedPositionFor({ source, line: 1, column: 0 })
		).toMatchObject({ line, column: lines[line - 1].indexOf(".token") });
		expect(
			consumer.generatedPositionFor({
				source,
				line: 1,
				column: original.indexOf('"')
			})
		).toMatchObject({ line, column: lines[line - 1].indexOf(TOKEN) });
	}
};
