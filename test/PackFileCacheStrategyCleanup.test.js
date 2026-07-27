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

describe("PackFileCacheStrategy cleanup", () => {
	const tempPath = path.resolve(__dirname, "js", "pack-cleanup");

	beforeEach((done) => {
		rimraf(tempPath, done);
	});

	it("deletes stale unreferenced files but keeps written, retained and recent ones", async () => {
		const fs = require("graceful-fs");

		const PackFileCacheStrategy = require("../lib/cache/PackFileCacheStrategy");

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
		const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
		for (const file of [
			"retained.pack",
			"nested.pack",
			"written.pack",
			"orphan-old.pack",
			"subdir"
		]) {
			fs.utimesSync(path.join(tempPath, file), oldTime, oldTime);
		}

		/** @type {EXPECTED_ANY} */
		const logger = {
			time: () => {},
			timeEnd: () => {},
			log: () => {},
			debug: () => {},
			warn: () => {},
			error: () => {},
			getChildLogger: () => logger
		};
		const strategy = new PackFileCacheStrategy({
			compiler: /** @type {EXPECTED_ANY} */ ({
				options: { output: { hashFunction: "md4" } }
			}),
			fs,
			context: tempPath,
			cacheLocation: tempPath,
			version: "test",
			logger,
			snapshot: /** @type {EXPECTED_ANY} */ ({
				managedPaths: [],
				immutablePaths: []
			}),
			maxAge: 1000 * 60
		});

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
			"written.pack"
		]);
	});

	it("aborts the whole cleanup and deletes nothing when a retained file is unreadable", async () => {
		const fs = require("graceful-fs");

		const PackFileCacheStrategy = require("../lib/cache/PackFileCacheStrategy");

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
		/** @type {EXPECTED_ANY} */
		const logger = {
			time: () => {},
			timeEnd: () => {},
			log: () => {},
			debug: () => {},
			warn: (/** @type {string} */ message) => warnings.push(message),
			error: () => {},
			getChildLogger: () => logger
		};
		const strategy = new PackFileCacheStrategy({
			compiler: /** @type {EXPECTED_ANY} */ ({
				options: { output: { hashFunction: "md4" } }
			}),
			fs,
			context: tempPath,
			cacheLocation: tempPath,
			version: "test",
			logger,
			snapshot: /** @type {EXPECTED_ANY} */ ({
				managedPaths: [],
				immutablePaths: []
			}),
			maxAge: 1000 * 60
		});

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

		const PackFileCacheStrategy = require("../lib/cache/PackFileCacheStrategy");

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
		/** @type {EXPECTED_ANY} */
		const fs = Object.create(gracefulFs);
		fs.open = (
			/** @type {string} */ file,
			/** @type {string} */ flags,
			/** @type {EXPECTED_ANY} */ callback
		) => {
			// the strategy joins paths with "/"; normalize so lookups built with
			// path.join match on Windows too
			const key = path.normalize(file);
			readCounts.set(key, (readCounts.get(key) || 0) + 1);
			gracefulFs.open(file, flags, callback);
		};

		/** @type {EXPECTED_ANY} */
		const logger = {
			time: () => {},
			timeEnd: () => {},
			log: () => {},
			debug: () => {},
			warn: () => {},
			error: () => {},
			getChildLogger: () => logger
		};
		const strategy = new PackFileCacheStrategy({
			compiler: /** @type {EXPECTED_ANY} */ ({
				options: { output: { hashFunction: "md4" } }
			}),
			fs,
			context: tempPath,
			cacheLocation: tempPath,
			version: "test",
			logger,
			snapshot: /** @type {EXPECTED_ANY} */ ({
				managedPaths: [],
				immutablePaths: []
			}),
			maxAge: 1000 * 60
		});

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

		const PackFileCacheStrategy = require("../lib/cache/PackFileCacheStrategy");

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

		/** @type {EXPECTED_ANY} */
		const logger = {
			time: () => {},
			timeEnd: () => {},
			log: () => {},
			debug: () => {},
			warn: () => {},
			error: () => {},
			getChildLogger: () => logger
		};
		const strategy = new PackFileCacheStrategy({
			compiler: /** @type {EXPECTED_ANY} */ ({
				options: { output: { hashFunction: "md4" } }
			}),
			fs,
			context: tempPath,
			cacheLocation: tempPath,
			version: "test",
			logger,
			snapshot: /** @type {EXPECTED_ANY} */ ({
				managedPaths: [],
				immutablePaths: []
			}),
			maxAge: 1000 * 60
		});

		// first store memoizes retained -> nested-a
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(fs.readdirSync(tempPath).sort()).toEqual([
			"nested-a.pack",
			"retained.pack"
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
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(fs.readdirSync(tempPath).sort()).toEqual([
			"nested-b.pack",
			"retained.pack"
		]);
	});
});
