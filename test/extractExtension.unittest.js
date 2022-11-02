"use strict";

const extractExtension = require("../lib/util/extractExtension");

describe("extractExtension", () => {
	const testCases = [
		["", ""],
		["/path/to/file", ""],
		["/path/to/file.ext", "ext"],
		["/path.to/file.ext", "ext"],
		["/path.to/file", ""],
		["/path.to/.file", ""],
		["/path.to/.file.ext", "ext"],
		["/path/to/f.ext", "ext"],
		["/path/to/..ext", "ext"],
		["/path/to/..", ""],
		["file", ""],
		["file.ext", "ext"],
		[".file", ""],
		[".file.ext", "ext"],
		["/file", ""],
		["/file.ext", "ext"],
		["/.file", ""],
		["/.file.ext", "ext"],
		[".path/file.ext", "ext"],
		["file.ext.ext", "ext"],
		["file.", ""],
		[".", ""],
		["./", ""],
		[".file.ext", "ext"],
		[".file", ""],
		[".file.", ""],
		[".file..", ""],
		["..", ""],
		["../", ""],
		["..file.ext", "ext"],
		["..file", "file"],
		["..file.", ""],
		["..file..", ""],
		["...", ""],
		["...ext", "ext"],
		["....", ""],
		["file.ext/", "ext"],
		["file.ext//", "ext"],
		["file/", ""],
		["file//", ""],
		["file./", ""],
		["file.//", ""],
		["/path/to/file/file.ext?foo=bar", "ext"],
		["/path/to/file/file.ext?bar=foo", "ext"]
	];

	testCases.forEach(([path, ext]) => {
		const extension = extractExtension(path);

		it(`should return the "${ext}" for the "${path}", get "${extension}"`, () => {
			expect(extension).toEqual(ext);
		});
	});
});
