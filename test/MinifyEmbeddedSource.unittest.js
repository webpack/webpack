"use strict";

const fs = require("fs");
const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../lib/index");

/** @typedef {import("../lib/util/fs").OutputFileSystem} OutputFileSystem */

const CSS = ".a {\n\tcolor : #ff0000 ;\n}\n";

const testDirectory = path.resolve(__dirname, "js", "MinifyEmbeddedSource");
const context = path.join(testDirectory, "src");
const cacheDirectory = path.join(testDirectory, "cache");

/**
 * @param {false | object} css `optimization.minimize.css`
 * @returns {Promise<string>} the CSS text the bundle embeds
 */
const build = (css) =>
	new Promise((resolve, reject) => {
		const compiler = webpack({
			mode: "production",
			context,
			entry: "./index.js",
			target: "web",
			experiments: { css: true },
			optimization: { minimize: { javascript: false, css } },
			cache: { type: "filesystem", cacheDirectory },
			module: {
				rules: [
					{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
				]
			},
			output: { path: "/out" },
			infrastructureLogging: { level: "error" }
		});
		const volume = new Volume();
		compiler.outputFileSystem = /** @type {OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(volume))
		);
		compiler.run((err, stats) => {
			if (err) return reject(err);
			if (/** @type {import("../lib/Stats")} */ (stats).hasErrors()) {
				return reject(
					new Error(
						/** @type {import("../lib/Stats")} */ (stats).toString({
							all: false,
							errors: true
						})
					)
				);
			}
			const code = /** @type {string} */ (
				volume.readFileSync("/out/main.js", "utf8")
			);
			// Written back only on close, so the next build reads a warm pack.
			compiler.close((closeErr) => {
				if (closeErr) return reject(closeErr);
				resolve(code);
			});
		});
	});

describe("CSS embedded in JavaScript", () => {
	beforeAll(() => {
		fs.rmSync(testDirectory, { recursive: true, force: true });
		fs.mkdirSync(context, { recursive: true });
		fs.writeFileSync(path.join(context, "style.css"), CSS);
		fs.writeFileSync(
			path.join(context, "index.js"),
			'import text from "./style.css";\nglobalThis.__OUT__ = text;\n'
		);
	});

	// The codegen cache is keyed by `Generator.updateHash`, which cannot see a
	// hook's taps — so `embeddedCssHash` carries the minifier's options into it.
	// Without that, the second build here replays the first's minified output.
	it("re-generates when minimize.css changes across a filesystem cache", async () => {
		const minified = await build({});
		expect(minified).toContain(".a{color:red}");

		const plain = await build(false);
		expect(plain).not.toContain(".a{color:red}");
		expect(plain).toContain("#ff0000");

		// And back, so the first result is not merely the one that got cached.
		expect(await build({})).toContain(".a{color:red}");
	});
});
