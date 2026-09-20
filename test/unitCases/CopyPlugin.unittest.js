"use strict";

require("../helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const { Volume, createFsFromVolume } = require("memfs");
/** @type {(path: string, callback: (err?: unknown) => void) => void} */
const rimraf = require("rimraf");

const tempFolderPath = path.join(
	path.resolve(__dirname, ".."),
	"CopyPluginTemp"
);
const staticPath = path.join(tempFolderPath, "static");
// the output directory sits inside the directory the pattern copies, which is
// what a project emitting its bundle into its own static folder looks like
const outputPath = path.join(staticPath, "build");
const stalePath = path.join(outputPath, "stale.txt");

/**
 * Lay out a project whose `output.path` is below what the pattern copies, with
 * a file an earlier build left in the output directory.
 * @returns {void}
 */
const createFiles = () => {
	fs.mkdirSync(path.join(staticPath, "nested"), { recursive: true });
	fs.mkdirSync(outputPath, { recursive: true });
	fs.writeFileSync(
		path.join(tempFolderPath, "index.js"),
		"module.exports = 1;"
	);
	fs.writeFileSync(path.join(staticPath, "keep.txt"), "keep");
	fs.writeFileSync(path.join(staticPath, "nested", "deep.txt"), "deep");
	fs.writeFileSync(stalePath, "stale");
};

/**
 * @returns {Promise<import("../../").Compilation>} the compilation of one build
 */
const compile = () => {
	const webpack = require("../..");
	const compiler = webpack({
		mode: "development",
		context: tempFolderPath,
		entry: "./index.js",
		output: {
			path: outputPath,
			filename: "bundle.js",
			copy: [{ from: "static", to: "." }]
		}
	});

	compiler.outputFileSystem = /** @type {EXPECTED_ANY} */ (
		createFsFromVolume(new Volume())
	);

	return new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
				return;
			}
			compiler.close(() => {
				resolve(/** @type {import("../../").Stats} */ (stats).compilation);
			});
		});
	});
};

describe("CopyPlugin", () => {
	/** @type {import("../../").Compilation} */
	let compilation;

	beforeAll(async () => {
		await new Promise((resolve) => {
			rimraf(tempFolderPath, resolve);
		});
		createFiles();
		compilation = await compile();
	});

	afterAll((done) => {
		rimraf(tempFolderPath, done);
	}, 30000);

	it("should not copy a file from inside the output path", () => {
		// copying it would write it one directory deeper on every build, which
		// invalidates the watch and grows the output without bound
		expect(compilation.getAsset("build/stale.txt")).toBeUndefined();
	});

	it("should copy the rest of the directory the output path sits in", () => {
		expect(compilation.getAsset("keep.txt")).toBeDefined();
		expect(compilation.getAsset("nested/deep.txt")).toBeDefined();
	});

	it("should not make a file inside the output path a dependency", () => {
		expect([...compilation.fileDependencies]).not.toContain(stalePath);
	});

	it("should report no error or warning", () => {
		expect(compilation.errors).toHaveLength(0);
		expect(compilation.warnings).toHaveLength(0);
	});
});
