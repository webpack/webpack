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
const fileAliasPath = path.join(staticPath, "stale-link.txt");

// codes a machine that cannot make a symlink reports
const SYMLINK_UNSUPPORTED = new Set(["EPERM", "EACCES", "ENOSYS", "UNKNOWN"]);

/**
 * @param {() => void} link what makes the link
 * @returns {boolean} whether this machine could make it
 */
const tryLink = (link) => {
	try {
		link();
	} catch (err) {
		const { code } = /** @type {NodeJS.ErrnoException} */ (err);
		// anything else is a broken fixture, which must fail rather than skip
		if (code === undefined || !SYMLINK_UNSUPPORTED.has(code)) {
			throw err;
		}
		return false;
	}
	return true;
};

/**
 * Lay out a project whose `output.path` is below what the pattern copies, with
 * a file an earlier build left in the output directory.
 * @returns {boolean} whether this machine could make the file link
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

	// `stat` reports a file link as a plain file, so nothing but `lstat` says
	// a `from` naming it names a link
	return tryLink(() => fs.symlinkSync(stalePath, fileAliasPath, "file"));
};

/**
 * @param {{ from: string, to: string, globOptions?: { followSymlinks?: boolean, ignore?: string[] } }} pattern what the build copies
 * @param {((copiedPath: string) => boolean | void)=} ignore what to tap the `ignore` hook with
 * @param {Record<string, EXPECTED_ANY>=} inputFileSystemOverrides members to replace on the input file system
 * @returns {Promise<import("../../").Compilation>} the compilation of one build
 */
const compile = (pattern, ignore, inputFileSystemOverrides) => {
	const webpack = require("../..");
	const compiler = webpack({
		mode: "development",
		context: tempFolderPath,
		entry: "./index.js",
		output: {
			path: outputPath,
			filename: "bundle.js",
			copy: [pattern]
		}
	});

	if (ignore) {
		compiler.hooks.thisCompilation.tap("Test", (compilation) => {
			webpack.CopyPlugin.getCompilationHooks(compilation).ignore.tap(
				"Test",
				ignore
			);
		});
	}

	compiler.outputFileSystem = /** @type {EXPECTED_ANY} */ (
		createFsFromVolume(new Volume())
	);
	if (inputFileSystemOverrides) {
		compiler.inputFileSystem = Object.assign(
			Object.create(compiler.inputFileSystem),
			inputFileSystemOverrides
		);
	}

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
	/** @type {boolean} */
	let fileAliased;

	beforeAll(async () => {
		await new Promise((resolve) => {
			rimraf(tempFolderPath, resolve);
		});
		fileAliased = createFiles();
		compilation = await compile({ from: "static", to: "." });
	});

	afterAll((done) => {
		rimraf(tempFolderPath, done);
	}, 30000);

	it("should copy from inside the output path by default", () => {
		// a pattern may read what an earlier build emitted, so leaving the output
		// directory out is the configuration's call, not webpack's
		expect(compilation.getAsset("build/stale.txt")).toBeDefined();
		expect(compilation.getAsset("keep.txt")).toBeDefined();
		expect(compilation.getAsset("nested/deep.txt")).toBeDefined();
	});

	it("should leave the output path out when globOptions.ignore names it", async () => {
		const ignored = await compile({
			from: "static",
			to: ".",
			globOptions: { ignore: ["**/build/**"] }
		});
		expect(ignored.getAsset("build/stale.txt")).toBeUndefined();
		expect(ignored.getAsset("keep.txt")).toBeDefined();
		expect([...ignored.fileDependencies]).not.toContain(stalePath);
	});

	it("should leave the output path out when the hook says so", async () => {
		const hooked = await compile({ from: "static", to: "." }, (copiedPath) =>
			copiedPath.includes("/static/build") ? true : undefined
		);
		expect(hooked.getAsset("build/stale.txt")).toBeUndefined();
		expect(hooked.getAsset("keep.txt")).toBeDefined();
	});

	it("should not watch a base the hook ignores", async () => {
		const hooked = await compile({ from: "static/build", to: "out" }, () => true);
		// watching it would rebuild on what this compilation itself wrote there
		expect([...hooked.contextDependencies]).not.toContain(outputPath);
		expect(hooked.warnings).toHaveLength(1);
		expect(hooked.warnings[0].name).toBe("EmptyCopyPatternWarning");
	});

	it("should copy what globOptions.ignore names when the hook says so", async () => {
		const pattern = {
			from: "static",
			to: ".",
			globOptions: { ignore: ["**/keep.txt"] }
		};
		// the hook answers first, so one answer overrules `globOptions.ignore`
		const overruled = await compile(pattern, (copiedPath) =>
			copiedPath.endsWith("/keep.txt") ? false : undefined
		);
		expect(overruled.getAsset("keep.txt")).toBeDefined();
		const byDefault = await compile(pattern);
		expect(byDefault.getAsset("keep.txt")).toBeUndefined();
	});

	it("should copy a named file symlink as a link when told not to follow", async () => {
		if (!fileAliased) return;
		const fromFileAlias = await compile({
			from: "static/stale-link.txt",
			to: "linked",
			globOptions: { followSymlinks: false }
		});
		const asset = fromFileAlias.getAsset("linked/stale-link.txt");
		// `stat` follows the link to call the `from` a file, so nothing else says
		// the link itself is what this pattern copies
		expect(asset).toBeDefined();
		expect(
			/** @type {import("../../").Asset} */ (asset).info.symlink
		).toBeDefined();
		// what the link says is its whole content, so its target is never read
		expect(
			/** @type {import("../../").Asset} */ (asset).source.source().toString()
		).toBe(stalePath);
	});

	it("should copy a named file symlink's target when following", async () => {
		if (!fileAliased) return;
		const followed = await compile({
			from: "static/stale-link.txt",
			to: "followed"
		});
		const asset = followed.getAsset("followed/stale-link.txt");
		// followed, it is copied as the file it points at rather than as a link
		expect(asset).toBeDefined();
		expect(
			/** @type {import("../../").Asset} */ (asset).info.symlink
		).toBeUndefined();
	});

	it("should skip a link globOptions.ignore names when not following", async () => {
		if (!fileAliased) return;
		const ignored = await compile({
			from: "static",
			to: ".",
			globOptions: { followSymlinks: false, ignore: ["**/stale-link.txt"] }
		});
		expect(ignored.getAsset("stale-link.txt")).toBeUndefined();
		expect(ignored.getAsset("keep.txt")).toBeDefined();
	});

	it("should treat a glob from as a glob when not following", async () => {
		// `lstat` reports the glob missing, which says it is no link either
		const globbed = await compile({
			from: "static/*.txt",
			to: "globbed",
			globOptions: { followSymlinks: false }
		});
		expect(globbed.getAsset("globbed/keep.txt")).toBeDefined();
		expect(globbed.errors).toHaveLength(0);
	});

	it("should copy a file from as a file on a file system without lstat", async () => {
		const withoutLstat = await compile(
			{
				from: "static/keep.txt",
				to: "plain",
				globOptions: { followSymlinks: false }
			},
			undefined,
			{ lstat: undefined }
		);
		expect(withoutLstat.getAsset("plain/keep.txt")).toBeDefined();
		expect(withoutLstat.errors).toHaveLength(0);
	});

	it("should report an lstat failure other than a missing path", async () => {
		const failing = await compile(
			{
				from: "static/keep.txt",
				to: "failing",
				globOptions: { followSymlinks: false }
			},
			undefined,
			{
				lstat: (
					/** @type {string} */ _path,
					/** @type {(err: NodeJS.ErrnoException) => void} */ callback
				) => callback(Object.assign(new Error("lstat failed"), { code: "EIO" }))
			}
		);
		expect(failing.getAsset("failing/keep.txt")).toBeUndefined();
		expect(failing.errors.length).toBeGreaterThan(0);
		expect(String(failing.errors[0].message)).toContain("lstat failed");
	});

	it("should report no error or warning", () => {
		expect(compilation.errors).toHaveLength(0);
		expect(compilation.warnings).toHaveLength(0);
	});
});
