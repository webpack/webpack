"use strict";

const {
	_getDirectories,
	_hasFile,
	_isEqualPath
} = require("../lib/CleanPlugin");

describe("CleanPlugin", () => {
	describe("_getDirectories", () => {
		it("should return empty set when assets map is empty", () => {
			const assets = new Map();
			const result = _getDirectories(assets);
			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(0);
		});

		it("should extract root directory from single file path", () => {
			const assets = new Map([["./static.js", 0]]);
			const result = _getDirectories(assets);
			expect([...result]).toEqual(["."]);
		});

		it("should extract all parent directories from deep nested path", () => {
			const assets = new Map([["this/dir/should/not/be/removed/file.ext", 0]]);
			const result = _getDirectories(assets);
			expect([...result]).toEqual([
				"this/dir/should/not/be/removed",
				"this/dir/should/not/be",
				"this/dir/should/not",
				"this/dir/should",
				"this/dir",
				"this",
				"."
			]);
		});

		it("should extract root and first level directories", () => {
			const assets = new Map([
				["./main.js", 0],
				["./js/main.js", 0]
			]);
			const result = _getDirectories(assets);
			expect([...result]).toEqual([".", "./js"]);
		});

		it("should extract all nested directory levels", () => {
			const assets = new Map([
				["./main.js", 0],
				["./js/main.js", 0],
				["./static/js/main.js", 0]
			]);
			const result = _getDirectories(assets);
			expect([...result]).toEqual([".", "./js", "./static/js", "./static"]);
		});
	});

	describe("_isEqualPath", () => {
		it("should normalize paths before comparison", () => {
			expect(_isEqualPath("this", "this")).toBe(true);
			expect(_isEqualPath("this", "./this")).toBe(true);
			expect(_isEqualPath("this/a", "./this/a")).toBe(true);
			expect(_isEqualPath("this", "this/a")).toBe(false);
		});
	});

	describe("_hasFile", () => {
		it("should find file in Set collection", () => {
			const files = new Set(["this"]);
			expect(_hasFile(files, "./this")).toBe(true);
			expect(_hasFile(files, "this")).toBe(true);
			expect(_hasFile(files, "this/a")).toBe(false);
		});

		it("should find file in Map collection", () => {
			const files = new Map([["this", 0]]);
			expect(_hasFile(files, "this")).toBe(true);
			expect(_hasFile(files, "./this")).toBe(true);
			expect(_hasFile(files, "this/a")).toBe(false);
		});
	});
});
