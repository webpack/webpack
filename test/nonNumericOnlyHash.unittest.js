"use strict";

const nonNumericOnlyHash = require("../lib/util/nonNumericOnlyHash");

it("hashLength=0", () => {
	expect(nonNumericOnlyHash("111", 0)).toBe("");
});

it("abc", () => {
	expect(nonNumericOnlyHash("abc", 10)).toBe("abc");
});

it("abc1", () => {
	expect(nonNumericOnlyHash("abc1", 3)).toBe("abc");
});

it("ab11", () => {
	expect(nonNumericOnlyHash("ab11", 3)).toBe("ab1");
});

it("0111", () => {
	expect(nonNumericOnlyHash("0111", 3)).toBe("a11");
});

it("911a", () => {
	expect(nonNumericOnlyHash("911a", 3)).toBe("d11");
});

it("511a", () => {
	expect(nonNumericOnlyHash("511a", 3)).toBe("f11");
});
