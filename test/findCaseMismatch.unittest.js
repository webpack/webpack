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

		it("gives up when the walk reaches the file system root", (done) => {
			// memfs always has a readable '/', so only a file system that reads
			// nothing at all lets the walk run out of parents
			const fs = /** @type {InputFileSystem} */ (
				/** @type {unknown} */ ({
					/**
					 * @param {string} directory directory
					 * @param {(err: Error) => void} callback callback
					 * @returns {void}
					 */
					readdir(directory, callback) {
						callback(new Error(`ENOENT: ${directory}`));
					}
				})
			);
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

		it("rewrites each occurrence of a repeated name in path order", () => {
			expect(
				applyCaseCorrections("./lib/lib/lib.js", [
					["lib", "Lib"],
					["lib", "LIB"],
					["lib.js", "Lib.js"]
				])
			).toBe("./Lib/LIB/Lib.js");
		});

		it("leaves a module request without a leading dot alone otherwise", () => {
			expect(
				applyCaseCorrections("case-package/lib/deep.js", [
					["Lib", "lib"],
					["Deep.js", "deep.js"]
				])
			).toBeUndefined();
		});

		it("rewrites a scoped package name", () => {
			expect(applyCaseCorrections("@Scope/pkg", [["@Scope", "@scope"]])).toBe(
				"@scope/pkg"
			);
		});

		it("returns the request unchanged when there is nothing to correct", () => {
			expect(applyCaseCorrections("./a.js", [])).toBe("./a.js");
		});

		it("does not offer a prefix that is already correctly cased", () => {
			// The request ends with 'sub', a prefix of 'subdir' that 'subDir' spells
			// the same way, so rewriting it would hand back the request unchanged
			expect(
				applyCaseCorrections("@/sub", [["subdir", "subDir"]])
			).toBeUndefined();
		});
	});
});
