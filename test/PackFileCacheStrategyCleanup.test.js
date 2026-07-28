"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const rimraf = require("rimraf");

// Matches VERSION in lib/serialization/FileMiddleware.js.
const VERSION = 0x01637077;

/**
 * @param {string[]} pointerNames referenced file names
 * @returns {Buffer} serialized file content with one pointer section per name
 */
const buildFileWithPointers = (pointerNames) => {
	const pointers = pointerNames.map((name) => {
		const nameBuffer = Buffer.from(name);
		const buf = Buffer.alloc(8 + nameBuffer.length);
		nameBuffer.copy(buf, 8);
		return buf;
	});
	const header = Buffer.alloc(8 + pointers.length * 4);
	header.writeUInt32LE(VERSION, 0);
	header.writeUInt32LE(pointers.length, 4);
	for (const [i, pointer] of pointers.entries()) {
		header.writeInt32LE(-pointer.length, 8 + i * 4);
	}
	return Buffer.concat([header, ...pointers]);
};

/**
 * Records the given files as unreferenced since before the grace period, which is
 * what a previous store would have left behind.
 * @param {typeof import("fs")} fs a file system
 * @param {string} directory cache directory
 * @param {string[]} files file names to backdate
 * @returns {void}
 */
const seedUnreferenced = (fs, directory, files) => {
	const firstSeen = Date.now() - 2 * 60 * 60 * 1000;
	/** @type {Record<string, { firstSeen: number, size: number }>} */
	const data = {};
	for (const file of files) {
		data[file] = {
			firstSeen,
			size: fs.statSync(path.join(directory, file)).size
		};
	}
	fs.writeFileSync(
		path.join(directory, "unreferenced.json"),
		JSON.stringify(data)
	);
};

describe("PackFileCacheStrategy cleanup", () => {
	const tempPath = path.resolve(__dirname, "js", "pack-cleanup");

	/**
	 * @param {import("../lib/util/fs").IntermediateFileSystem} fs a file system
	 * @param {string[]=} warnings collects logged warnings
	 * @returns {import("../lib/cache/PackFileCacheStrategy")} a strategy writing to the temp directory
	 */
	const createStrategy = (fs, warnings) => {
		const PackFileCacheStrategy = require("../lib/cache/PackFileCacheStrategy");
		const { LogType, Logger } = require("../lib/logging/Logger");

		/** @type {import("../lib/logging/Logger").Logger} */
		const logger = new Logger(
			(type, args) => {
				if (warnings && type === LogType.warn && args) {
					warnings.push(String(args[0]));
				}
			},
			() => logger
		);
		return new PackFileCacheStrategy({
			compiler: /** @type {import("../lib/Compiler")} */ (
				/** @type {unknown} */ ({
					options: { output: { hashFunction: "md4" } }
				})
			),
			fs,
			context: tempPath,
			cacheLocation: tempPath,
			version: "test",
			logger,
			snapshot: { managedPaths: [], immutablePaths: [] },
			maxAge: 1000 * 60
		});
	};

	beforeEach((done) => {
		rimraf(tempPath, done);
	});

	it("deletes stale unreferenced files but keeps written, retained and recent ones", async () => {
		const fs = require("graceful-fs");

		fs.mkdirSync(tempPath, { recursive: true });
		// "retained" references "nested" via a lazy pointer; only walking finds it
		fs.writeFileSync(
			path.join(tempPath, "retained.pack"),
			buildFileWithPointers(["nested"])
		);
		fs.writeFileSync(
			path.join(tempPath, "nested.pack"),
			buildFileWithPointers([])
		);
		fs.writeFileSync(path.join(tempPath, "written.pack"), "written");
		fs.writeFileSync(path.join(tempPath, "orphan-old.pack"), "orphan");
		fs.writeFileSync(path.join(tempPath, "orphan-new.pack"), "orphan");
		fs.mkdirSync(path.join(tempPath, "subdir"));
		// only "orphan-old" was already unreferenced a grace period ago
		seedUnreferenced(fs, tempPath, ["orphan-old.pack"]);

		const strategy = createStrategy(fs);

		await strategy._cleanupUnusedFiles(
			new Set(["written"]),
			new Set(["retained"])
		);

		const files = fs.readdirSync(tempPath).sort();
		expect(files).toEqual([
			"nested.pack",
			"orphan-new.pack",
			"retained.pack",
			"subdir",
			"unreferenced.json",
			"written.pack"
		]);
	});

	it("deletes an orphan only once it survived a grace period", async () => {
		const fs = require("graceful-fs");

		fs.mkdirSync(tempPath, { recursive: true });
		fs.writeFileSync(path.join(tempPath, "orphan.pack"), "orphan");
		// a restored cache refreshes modification times, so aging must not use them
		const now = new Date();
		fs.utimesSync(path.join(tempPath, "orphan.pack"), now, now);

		const strategy = createStrategy(fs);

		// first store only records the orphan
		await strategy._cleanupUnusedFiles(new Set(), new Set());
		expect(fs.readdirSync(tempPath).sort()).toEqual([
			"orphan.pack",
			"unreferenced.json"
		]);

		// a later store past the grace period deletes it, despite the fresh mtime
		seedUnreferenced(fs, tempPath, ["orphan.pack"]);
		fs.utimesSync(path.join(tempPath, "orphan.pack"), now, now);
		await strategy._cleanupUnusedFiles(new Set(), new Set());
		expect(fs.readdirSync(tempPath).sort()).toEqual(["unreferenced.json"]);
	});

	it("restarts the grace period when an orphaned name is rewritten", async () => {
		const fs = require("graceful-fs");

		fs.mkdirSync(tempPath, { recursive: true });
		fs.writeFileSync(path.join(tempPath, "orphan.pack"), "orphan");
		seedUnreferenced(fs, tempPath, ["orphan.pack"]);
		// another process rewrote the same name, so the recorded age no longer applies
		fs.writeFileSync(path.join(tempPath, "orphan.pack"), "rewritten content");

		const strategy = createStrategy(fs);

		await strategy._cleanupUnusedFiles(new Set(), new Set());
		expect(fs.readdirSync(tempPath).sort()).toEqual([
			"orphan.pack",
			"unreferenced.json"
		]);
	});

	it("aborts the whole cleanup and deletes nothing when a retained file is unreadable", async () => {
		const fs = require("graceful-fs");

		fs.mkdirSync(tempPath, { recursive: true });
		// walking this retained file fails: the live set would be incomplete
		fs.writeFileSync(path.join(tempPath, "corrupt.pack"), "not a pack file");
		// stale orphan that a successful cleanup would delete
		fs.writeFileSync(path.join(tempPath, "orphan-old.pack"), "orphan");
		const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
		for (const file of ["corrupt.pack", "orphan-old.pack"]) {
			fs.utimesSync(path.join(tempPath, file), oldTime, oldTime);
		}

		/** @type {string[]} */
		const warnings = [];
		const strategy = createStrategy(fs, warnings);

		await strategy._cleanupUnusedFiles(new Set(), new Set(["corrupt"]));

		// nothing was deleted, not even the stale orphan
		expect(fs.readdirSync(tempPath).sort()).toEqual([
			"corrupt.pack",
			"orphan-old.pack"
		]);
		expect(warnings).toEqual([
			expect.stringMatching(/Cleanup of unused cache files failed/)
		]);
	});

	it("walks each retained file only once across stores", async () => {
		const gracefulFs = require("graceful-fs");

		gracefulFs.mkdirSync(tempPath, { recursive: true });
		gracefulFs.writeFileSync(
			path.join(tempPath, "retained.pack"),
			buildFileWithPointers(["nested"])
		);
		gracefulFs.writeFileSync(
			path.join(tempPath, "nested.pack"),
			buildFileWithPointers([])
		);

		/** @type {Map<string, number>} */
		const readCounts = new Map();
		/** @type {import("../lib/util/fs").IntermediateFileSystem} */
		const fs = Object.create(gracefulFs);
		// only the three argument overload is used by the strategy
		fs.open = /** @type {import("../lib/util/fs").Open} */ (
			/** @type {unknown} */ (
				(
					/** @type {string} */ file,
					/** @type {string} */ flags,
					/** @type {import("../lib/util/fs").NumberCallback} */ callback
				) => {
					// the strategy joins paths with "/"; normalize so lookups built with
					// path.join match on Windows too
					const key = path.normalize(file);
					readCounts.set(key, (readCounts.get(key) || 0) + 1);
					gracefulFs.open(file, flags, callback);
				}
			)
		);

		const strategy = createStrategy(fs);

		const retainedPath = path.join(tempPath, "retained.pack");
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(readCounts.get(retainedPath)).toBe(1);
		// second store: both walked files come from the memo, no re-read
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(readCounts.get(retainedPath)).toBe(1);
		expect(readCounts.get(path.join(tempPath, "nested.pack"))).toBe(1);
		// a rewritten file is dropped from the memo and walked again when retained
		await strategy._cleanupUnusedFiles(new Set(["retained"]), new Set());
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(readCounts.get(retainedPath)).toBe(2);
		// entries of files that are no longer alive are pruned
		strategy._referencedFilesCache.set("ghost", {
			mtimeMs: 0,
			referenced: []
		});
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(strategy._referencedFilesCache.has("ghost")).toBe(false);
		expect(strategy._referencedFilesCache.has("retained")).toBe(true);
	});

	it("re-reads a retained file rewritten in place by a concurrent process", async () => {
		const fs = require("graceful-fs");

		fs.mkdirSync(tempPath, { recursive: true });
		fs.writeFileSync(
			path.join(tempPath, "retained.pack"),
			buildFileWithPointers(["nested-a"])
		);
		fs.writeFileSync(
			path.join(tempPath, "nested-a.pack"),
			buildFileWithPointers([])
		);
		fs.writeFileSync(
			path.join(tempPath, "nested-b.pack"),
			buildFileWithPointers([])
		);
		const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
		for (const file of ["retained.pack", "nested-a.pack", "nested-b.pack"]) {
			fs.utimesSync(path.join(tempPath, file), oldTime, oldTime);
		}

		const strategy = createStrategy(fs);

		// first store memoizes retained -> nested-a
		seedUnreferenced(fs, tempPath, ["nested-b.pack"]);
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(fs.readdirSync(tempPath).sort()).toEqual([
			"nested-a.pack",
			"retained.pack",
			"unreferenced.json"
		]);

		// a concurrent process rewrites retained.pack to reference nested-b
		fs.writeFileSync(
			path.join(tempPath, "retained.pack"),
			buildFileWithPointers(["nested-b"])
		);
		fs.writeFileSync(
			path.join(tempPath, "nested-b.pack"),
			buildFileWithPointers([])
		);
		// old but newer than the memoized mtime, so the memo must be refreshed
		const newerOldTime = new Date(Date.now() - 60 * 60 * 1000);
		for (const file of ["retained.pack", "nested-b.pack"]) {
			fs.utimesSync(path.join(tempPath, file), newerOldTime, newerOldTime);
		}

		// a stale memo would keep nested-a alive and delete nested-b
		seedUnreferenced(fs, tempPath, ["nested-a.pack"]);
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(fs.readdirSync(tempPath).sort()).toEqual([
			"nested-b.pack",
			"retained.pack",
			"unreferenced.json"
		]);
	});
});
