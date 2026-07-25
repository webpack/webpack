"use strict";

const removeBOM = require("../lib/util/removeBOM");

describe("removeBOM", () => {
	it("should strip a leading BOM from a string", () => {
		expect(removeBOM("﻿hi")).toBe("hi");
	});

	it("should leave a string without a BOM untouched", () => {
		expect(removeBOM("hi")).toBe("hi");
	});

	it("should strip a leading UTF-8 BOM from a buffer", () => {
		const result = removeBOM(Buffer.from([0xef, 0xbb, 0xbf, 65, 66]));
		expect(/** @type {Buffer} */ (result).toString()).toBe("AB");
	});

	it("should leave a buffer without a BOM untouched", () => {
		const input = Buffer.from([65, 66]);
		expect(removeBOM(input)).toBe(input);
	});
});
