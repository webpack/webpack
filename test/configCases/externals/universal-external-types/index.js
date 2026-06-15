"use strict";

const fsViaNodeCommonjs = require("nodeCommonjs");
const sum = require("varExpr");
const fsViaStaticModule = require("staticModule");

it("supports the external types usable in a universal ESM target", async () => {
	// node-commonjs: defensive createRequire, browser-safe at load
	expect(typeof fsViaNodeCommonjs.readFileSync).toBe("function");
	// var: plain expression external
	expect(sum).toBe(3);
	// module: static ESM import (resolves a real module in node)
	expect(typeof fsViaStaticModule.readFileSync).toBe("function");
	// import: dynamic import, stays lazy
	const os = await import("dynamic");
	expect(typeof os.platform).toBe("function");
});
