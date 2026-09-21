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
const aliasPath = path.join(staticPath, "alias");
const fileAliasPath = path.join(staticPath, "stale-link.txt");

// codes a machine that cannot make a directory symlink reports
const SYMLINK_UNSUPPORTED = new Set(["EPERM", "EACCES", "ENOSYS", "UNKNOWN"]);

/**
 * @param {() => void} link what makes one of the links
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
 * @returns {{ aliased: boolean, fileAliased: boolean }} which links this machine could make
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

	// each link is attempted on its own: a machine that refuses one may well
	// make the other, and one refusal must not skip both groups of tests
	return {
		// a file link is what `stat` reports as a plain file, so it reaches the
		// output directory without ever being recognized as a link
		fileAliased: tryLink(() =>
			fs.symlinkSync(stalePath, fileAliasPath, "file")
		),
		aliased: tryLink(() => fs.symlinkSync(outputPath, aliasPath, "junction"))
	};
};

/**
 * @param {{ from: string, to: string, globOptions?: { followSymlinks?: boolean, ignore?: string[] } }} pattern what the build copies
 * @param {((copiedPath: string) => boolean | void)=} ignore what to tap the `ignore` hook with
 * @returns {Promise<import("../../").Compilation>} the compilation of one build
 */
const compile = (pattern, ignore) => {
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
	/** @type {import("../../").Compilation | undefined} */
	let fromAliasCompilation;
	/** @type {import("../../").Compilation} */
	let hookedCompilation;
	/** @type {boolean} */
	let aliased;
	/** @type {boolean} */
	let fileAliased;

	beforeAll(async () => {
		await new Promise((resolve) => {
			rimraf(tempFolderPath, resolve);
		});
		({ aliased, fileAliased } = createFiles());
		compilation = await compile({ from: "static", to: "." });
		// the output directory is answered too: one left ignored is never walked,
		// so the file below it would not be reached
		hookedCompilation = await compile({ from: "static", to: "." }, (copiedPath) =>
			copiedPath.includes("/static/build") ? false : undefined
		);
		if (aliased) {
			fromAliasCompilation = await compile({
				from: "static/alias",
				to: "aliased"
			});
		}
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

	it("should not follow a symlink which aliases the output path", () => {
		if (!aliased) return;
		// the link resolves into the output directory, so following it would copy
		// the build's own output under a name the lexical check never sees
		expect(compilation.getAsset("alias/stale.txt")).toBeUndefined();
	});

	it("should copy nothing when the pattern itself names such a symlink", () => {
		if (!fromAliasCompilation) return;
		// the base resolves into the output directory, so the pattern reaches no
		// file and says so rather than copying the build's own output
		expect(
			[...fromAliasCompilation.getAssets()].filter((asset) =>
				asset.name.startsWith("aliased/")
			)
		).toHaveLength(0);
		expect(fromAliasCompilation.warnings).toHaveLength(1);
		expect(fromAliasCompilation.warnings[0].name).toBe(
			"EmptyCopyPatternWarning"
		);
	});

	it("should not follow a file symlink into the output path", () => {
		if (!fileAliased) return;
		// `stat` follows the link and reports a plain file, so nothing about the
		// walk says the bytes come from the output directory
		expect(compilation.getAsset("stale-link.txt")).toBeUndefined();
	});

	it("should copy nothing when the pattern names such a file symlink", async () => {
		if (!fileAliased) return;
		const fromFileAlias = await compile({
			from: "static/stale-link.txt",
			to: "named"
		});
		// `to` names a directory, so the copy would land as `named/stale-link.txt`
		// rather than under the name `to` gives
		expect(
			[...fromFileAlias.getAssets()].filter((asset) =>
				asset.name.startsWith("named")
			)
		).toHaveLength(0);
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
		// what the link says is its whole content, so the file it points at inside
		// the output directory is never read
		expect(
			/** @type {import("../../").Asset} */ (asset).source.source().toString()
		).toBe(stalePath);
	});

	it("should not make a symlink into the output path a dependency", () => {
		if (!fromAliasCompilation) return;
		// the base resolves into the output directory, so watching it would
		// rebuild on what this compilation itself wrote there, under the alias
		expect([...fromAliasCompilation.contextDependencies]).not.toContain(
			aliasPath
		);
	});

	it("should not make a file inside the output path a dependency", () => {
		expect([...compilation.fileDependencies]).not.toContain(stalePath);
	});

	it("should copy from inside the output path when the hook says so", () => {
		// the default is there to stop a build reading what it wrote; a plugin
		// that wants exactly that says so and is not overruled
		expect(hookedCompilation.getAsset("build/stale.txt")).toBeDefined();
	});

	it("should copy what globOptions.ignore names when the hook says so", async () => {
		const pattern = {
			from: "static",
			to: ".",
			globOptions: { ignore: ["**/keep.txt"] }
		};
		// the hook answers ahead of everything, so one answer overrules whichever
		// of them would otherwise have kept the file out
		const overruled = await compile(pattern, (copiedPath) =>
			copiedPath.endsWith("/keep.txt") ? false : undefined
		);
		expect(overruled.getAsset("keep.txt")).toBeDefined();
		const byDefault = await compile(pattern);
		expect(byDefault.getAsset("keep.txt")).toBeUndefined();
	});

	it("should report no error or warning", () => {
		expect(compilation.errors).toHaveLength(0);
		expect(compilation.warnings).toHaveLength(0);
	});
});
