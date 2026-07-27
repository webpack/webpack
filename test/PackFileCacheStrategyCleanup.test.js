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
			readCounts.set(file, (readCounts.get(file) || 0) + 1);
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
		strategy._referencedFilesCache.set("ghost", []);
		await strategy._cleanupUnusedFiles(new Set(), new Set(["retained"]));
		expect(strategy._referencedFilesCache.has("ghost")).toBe(false);
		expect(strategy._referencedFilesCache.has("retained")).toBe(true);
	});
});
