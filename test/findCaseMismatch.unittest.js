"use strict";

const { Volume, createFsFromVolume } = require("memfs");
const {
	applyCaseCorrections,
	findCaseMismatch
} = require("../lib/util/findCaseMismatch");

/** @typedef {import("../lib/util/fs").InputFileSystem} InputFileSystem */

/**
 * @param {Record<string, string>} files volume contents
 * @returns {InputFileSystem} a case-sensitive in-memory file system
 */
const createFileSystem = (files) =>
	/** @type {InputFileSystem} */ (
		/** @type {unknown} */ (createFsFromVolume(Volume.fromJSON(files)))
	);

describe("util/findCaseMismatch", () => {
	describe("findCaseMismatch", () => {
		it("finds a wrongly cased file in an existing directory", (done) => {
			const fs = createFileSystem({ "/app/src/fileName.js": "" });
			findCaseMismatch(fs, "/app/src/filename.js", (mismatch) => {
				expect(mismatch).toEqual({
					corrections: [["filename.js", "fileName.js"]],
					path: "/app/src/fileName.js"
				});
				done();
			});
		});

		it("finds a wrongly cased directory by walking up to an existing one", (done) => {
			const fs = createFileSystem({ "/app/src/subDir/nested.js": "" });
			findCaseMismatch(fs, "/app/src/subdir/nested.js", (mismatch) => {
				expect(mismatch).toEqual({
					corrections: [["subdir", "subDir"]],
					path: "/app/src/subDir/nested.js"
				});
				done();
			});
		});

		it("corrects every wrongly cased segment of a path", (done) => {
			const fs = createFileSystem({ "/app/Src/subDir/nested.js": "" });
			findCaseMismatch(fs, "/app/src/subdir/NESTED.js", (mismatch) => {
				expect(mismatch).toEqual({
					corrections: [
						["src", "Src"],
						["subdir", "subDir"],
						["NESTED.js", "nested.js"]
					],
					path: "/app/Src/subDir/nested.js"
				});
				done();
			});
		});

		it("gives up when more than one entry matches", (done) => {
			const fs = createFileSystem({
				"/app/src/Foo.js": "",
				"/app/src/foo.js": ""
			});
			findCaseMismatch(fs, "/app/src/FOO.js", (mismatch) => {
				expect(mismatch).toBeUndefined();
				done();
			});
		});

		it("gives up when a segment is not a directory", (done) => {
			const fs = createFileSystem({ "/app/src/fileName.js": "" });
			findCaseMismatch(fs, "/app/src/filename.js/inner.js", (mismatch) => {
				expect(mismatch).toBeUndefined();
				done();
			});
		});

		it("reports nothing when every segment already has the real casing", (done) => {
			const fs = createFileSystem({ "/app/src/fileName.js": "" });
			findCaseMismatch(fs, "/app/src/fileName.js", (mismatch) => {
				expect(mismatch).toBeUndefined();
				done();
			});
		});

		it("gives up on a path with no existing ancestor", (done) => {
			const fs = createFileSystem({ "/other/file.js": "" });
			findCaseMismatch(fs, "/app/src/filename.js", (mismatch) => {
				expect(mismatch).toBeUndefined();
				done();
			});
		});

		it("bounds the walk on a very deep path", (done) => {
			const fs = createFileSystem({ "/app/file.js": "" });
			const deep = `/${"a/".repeat(25)}filename.js`;
			findCaseMismatch(fs, deep, (mismatch) => {
				expect(mismatch).toBeUndefined();
				done();
			});
		});
	});

	describe("applyCaseCorrections", () => {
		it("rewrites a segment spelled out in the request", () => {
			expect(
				applyCaseCorrections("./subdir/nested.js", [
					["subdir", "subDir"],
					["nested.js", "Nested.js"]
				])
			).toBe("./subDir/Nested.js");
		});

		it("rewrites the prefix a request without an extension spells", () => {
			expect(
				applyCaseCorrections("./filename", [["filename.js", "fileName.js"]])
			).toBe("./fileName");
		});

		it("returns nothing when the request does not spell the segment", () => {
			expect(
				applyCaseCorrections("@/nested.js", [["subdir", "subDir"]])
			).toBeUndefined();
		});
	});
});
