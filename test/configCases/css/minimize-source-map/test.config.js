"use strict";

const fs = require("fs");
const path = require("path");
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive via webpack-sources, used only to verify the emitted map
const { SourceMapConsumer } = require("source-map");

module.exports = {
	afterExecute(options) {
		const dir = options.output.path;
		const css = fs.readFileSync(path.join(dir, "bundle0.css"), "utf8");

		// The CSS is minified and links its map.
		expect(css).toContain(".first{color:red}.second{width:10px}");
		expect(css).toMatch(/sourceMappingURL=bundle0\.css\.map/);

		// A valid v3 map that carries the original source back through minification.
		const map = JSON.parse(
			fs.readFileSync(path.join(dir, "bundle0.css.map"), "utf8")
		);
		expect(map.version).toBe(3);
		expect(map.sources.some((s) => /style\.css/.test(s))).toBe(true);
		expect(map.sourcesContent[0]).toContain(".second {");

		// The minified `.second` rule maps back to its line in the original source
		// (`.second {` is line 5 of style.css) — the minifier's map, composed with
		// the native-CSS input map, points at the original file.
		// `source-map` 0.6 is synchronous, so this runs before `afterExecute` returns.
		const consumer = new SourceMapConsumer(map);
		const pos = consumer.originalPositionFor({
			line: 1,
			column: css.indexOf(".second")
		});
		expect(pos.source).toMatch(/style\.css/);
		expect(pos.line).toBe(5);
	}
};
