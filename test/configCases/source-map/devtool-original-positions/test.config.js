"use strict";

const fs = require("fs");
const path = require("path");
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive via webpack-sources, used only to verify the emitted map
const { SourceMapConsumer } = require("source-map");

const VARIANTS = require("./variants");

const MARKER = '"ORIGINAL_POSITION_MARKER"';
const INLINE_MAP =
	/\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,([A-Za-z0-9+/=]+)/;

module.exports = {
	afterExecute(options) {
		for (let i = 0; i < VARIANTS.length; i++) {
			const [, devtool] = VARIANTS[i];
			const dir = options[i].output.path;
			const bundle = fs.readFileSync(path.join(dir, `bundle${i}.js`), "utf8");
			const mapFile = path.join(dir, `bundle${i}.js.map`);
			const inline = devtool.startsWith("inline-");
			const hidden = devtool.startsWith("hidden-");

			let map;
			if (inline) {
				expect(fs.existsSync(mapFile)).toBe(false);
				const match = INLINE_MAP.exec(bundle);
				expect(match).not.toBeNull();
				map = JSON.parse(
					Buffer.from(
						/** @type {RegExpExecArray} */ (match)[1],
						"base64"
					).toString("utf8")
				);
			} else {
				const comment = `//# sourceMappingURL=bundle${i}.js.map`;
				if (hidden) {
					expect(bundle).not.toContain("sourceMappingURL");
				} else {
					expect(bundle).toContain(comment);
				}
				map = JSON.parse(fs.readFileSync(mapFile, "utf8"));
			}

			expect(map.version).toBe(3);
			expect(map.file).toBe(`bundle${i}.js`);
			const source = map.sources.find((name) => /module\.js$/.test(name));
			expect(source).toBeDefined();
			if (devtool.startsWith("nosources-")) {
				expect(map.sourcesContent).toBeUndefined();
			} else {
				const original = map.sourcesContent[map.sources.indexOf(source)];
				expect(original).toContain(`= ${MARKER};`);
			}

			// The marker statement sits on line 3 of `module.js`.
			const lines = bundle.split("\n");
			const line = lines.findIndex((text) => text.includes(MARKER)) + 1;
			expect(line).toBeGreaterThan(0);
			const consumer = new SourceMapConsumer(map);
			const position = consumer.originalPositionFor({
				line,
				column: lines[line - 1].indexOf(MARKER)
			});
			expect({ devtool, source: position.source, line: position.line }).toEqual(
				{
					devtool,
					source: consumer.sources.find((name) => /module\.js$/.test(name)),
					line: 3
				}
			);
		}
	}
};
