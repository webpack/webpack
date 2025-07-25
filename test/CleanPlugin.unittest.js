"use strict";

const { _getDirectories } = require("../lib/CleanPlugin");

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
});
