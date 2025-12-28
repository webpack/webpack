"use strict";

const fs = require("fs");
const path = require("path");

it("should not try to resolve directories in new URL()", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	try {
		expect(source).toMatch(/new URL\("\.\/subdir\/",/);
		expect(source).toMatch(/new URL\("\.\/",/);
		expect(source).toMatch(/new URL\("\.",/);
		expect(source).toMatch(/new URL\("\.\.",/);
		expect(source).not.toContain("webpackMissingModule");
	} catch (e) {
		console.log("Generated Source:\n" + source);
		throw e;
	}
});
