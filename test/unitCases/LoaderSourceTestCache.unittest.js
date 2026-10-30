"use strict";

const fs = require("graceful-fs");
const path = require("path");
const rimraf = /** @type {{ sync: (path: string) => void }} */ (require("rimraf"));
const webpack = require("../..");

const root = path.resolve(__dirname, "../fixtures/temp-loader-source-test-cache");
const sourceFile = path.join(root, "source", "index.js");
const outputFile = path.join(root, "dist", "main.js");

/**
 * Runs a new compiler against the same filesystem cache.
 * @param {string | RegExp} sourceTest source test
 * @returns {Promise<string>} emitted bundle
 */
function build(sourceTest) {
	return new Promise((resolve, reject) => {
		const compiler = webpack({
			context: path.dirname(sourceFile),
			entry: "./index.js",
			mode: "development",
			devtool: false,
			cache: {
				type: "filesystem",
				cacheDirectory: path.join(root, "cache")
			},
			module: {
				rules: [
					{
						use: [
							{
								loader: path.resolve(
									__dirname,
									"../configCases/loaders/source-test/transform-loader.js"
								),
								options: { value: "filtered" },
								sourceTest
							}
						]
					}
				]
			},
			output: { path: path.dirname(outputFile), filename: "main.js" }
		});
		compiler.run((error, stats) => {
			const buildError =
				error ||
				(stats && stats.hasErrors() ? new Error(stats.toString()) : null);
			compiler.close((closeError) => {
				if (buildError || closeError) return reject(buildError || closeError);
				resolve(fs.readFileSync(outputFile, "utf8"));
			});
		});
	});
}

describe("loader sourceTest filesystem cache", () => {
	beforeEach(() => {
		rimraf.sync(root);
		fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
	});

	afterEach(() => {
		rimraf.sync(root);
	});

	for (const sourceTest of ["marker", /marker/]) {
		it(`restores and invalidates ${sourceTest} across compilers`, async () => {
			fs.writeFileSync(sourceFile, '// marker\nexport default "__VALUE__";\n');
			expect(await build(sourceTest)).toContain('"filtered"');
			expect(await build(sourceTest)).toContain('"filtered"');
			fs.writeFileSync(sourceFile, 'export default "__VALUE__";\n');
			expect(await build(sourceTest)).toContain('"__VALUE__"');
		});
	}
});
