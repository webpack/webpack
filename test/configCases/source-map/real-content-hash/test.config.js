"use strict";

const fs = require("fs");
const path = require("path");

const findOutputFiles = require("../../../helpers/findOutputFiles");

const SOURCE_MAPPING_URL = /[#@] sourceMappingURL=([^\s*]+)/;

// Per config index (see webpack.config.js).
const HIDDEN = new Set([2]);
const MASKED_FILE = new Set([4]);
const CONTENT_HASHED = new Set([0, 1, 2, 4, 5, 6, 7]);

module.exports = {
	findBundle(i, options) {
		const bundle = findOutputFiles(options, /^main\.[a-f0-9]+\.js$/, `cfg${i}`);
		expect(bundle).toHaveLength(1);
		return `./cfg${i}/${bundle[0]}`;
	},
	afterExecute(options) {
		for (let i = 0; i < options.length; i++) {
			const outputPath = options[i].output.path;
			const dir = path.join(outputPath, `cfg${i}`);
			const files = fs.readdirSync(dir);
			const maps = files.filter((file) => file.endsWith(".map"));
			const assets = files.filter((file) => /\.(js|css)$/.test(file));
			expect(maps.length).toBeGreaterThan(0);
			expect(maps).toHaveLength(assets.length);

			const hashes = new Set();
			for (const file of files) {
				for (const hash of file.match(/[a-f0-9]{8,}/g) || []) {
					hashes.add(hash);
				}
			}

			/** @type {Set<string>} */
			const referencedMaps = new Set();
			for (const asset of assets) {
				const content = fs.readFileSync(path.join(dir, asset), "utf8");
				const match = SOURCE_MAPPING_URL.exec(content);
				let mapFile;
				if (HIDDEN.has(i)) {
					expect(match).toBeNull();
					mapFile = `${asset}.map`;
				} else {
					expect(match).not.toBeNull();
					mapFile = path.basename(/** @type {RegExpExecArray} */ (match)[1]);
				}
				expect(files).toContain(mapFile);
				referencedMaps.add(mapFile);

				const map = JSON.parse(
					fs.readFileSync(path.join(dir, mapFile), "utf8")
				);
				expect(map.version).toBe(3);
				expect(map.sources.length).toBeGreaterThan(0);
				expect(typeof map.mappings).toBe("string");
				expect(map.mappings.length).toBeGreaterThan(0);

				// `file` names the generated asset, relative to `output.path`.
				const assetName = `cfg${i}/${asset}`;
				if (MASKED_FILE.has(i)) {
					const hash = /** @type {RegExpMatchArray} */ (
						asset.match(/\.([a-f0-9]+)\.(?:js|css)$/)
					)[1];
					expect(map.file).toBe(
						assetName.replace(hash, "x".repeat(hash.length))
					);
				} else {
					expect(map.file).toBe(assetName);
					expect(fs.existsSync(path.join(outputPath, map.file))).toBe(true);
				}

				// Every hash-like token in an emitted file must name an emitted file:
				// a token left from before `realContentHash` points nowhere.
				if (CONTENT_HASHED.has(i)) {
					const length = /** @type {RegExpMatchArray} */ (
						asset.match(/\.([a-f0-9]+)\.(?:js|css)$/)
					)[1].length;
					const tokenRegExp = new RegExp(`\\b[a-f0-9]{${length}}\\b`, "g");
					for (const text of [content, JSON.stringify(map)]) {
						for (const token of text.match(tokenRegExp) || []) {
							expect(hashes).toContain(token);
						}
					}
				}
			}
			expect([...referencedMaps].sort()).toEqual(maps.sort());
		}
	}
};
