"use strict";

const fs = require("fs");
const path = require("path");
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive via webpack-sources, used only to verify the emitted map
const { SourceMapConsumer } = require("source-map");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	async afterExecute(options) {
		const dir = options.output.path;
		const css = fs.readFileSync(path.join(dir, "bundle0.css"), "utf8");

		// The nested payload was minified: its runs of spaces are gone.
		expect(css).toContain("<rect fill='red' />");
		expect(css).not.toContain("<rect  fill='red'  />");

		const map = JSON.parse(
			fs.readFileSync(path.join(dir, "bundle0.css.map"), "utf8")
		);
		const consumer = await new SourceMapConsumer(map);

		// Rewriting the payload shortened the line, so everything after it sits
		// at a different column than it was mapped from. The rule after it still
		// has to point at the line it was written on (line 9 of style.css).
		const position = consumer.originalPositionFor({
			line: 1,
			column: css.indexOf(".after")
		});

		expect(position.line).toBe(9);
		expect(position.column).toBe(0);
		expect(position.source).toMatch(/style\.css$/);
	}
};
