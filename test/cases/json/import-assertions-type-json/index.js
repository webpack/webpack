import c from "../data/c.json" assert { type: "json" };
import unknownJson from "../data/unknown" assert { type: "json" };
import unknownJs from "../data/unknown";

it("should be possible to import json data with import assertion", function () {
	expect(c).toEqual([1, 2, 3, 4]);
});

it("should be possible to import json data without extension with import assertion", function () {
	expect(unknownJson).toEqual([1, 2, 3, 4]);
});

it("should be possible to import js without extension without import assertion in the same file", function () {
	expect(unknownJs).toEqual({});
});

it("should not be possible to import js with import assertion", function () {
	expect(() => {
		require("./import-poison.js");
	}).toThrowError();
});
