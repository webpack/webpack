import promiseVal from "promiseExt";

const fsViaNodeCommonjs = require("nodeCommonjs");
const sum = require("varExpr");
const assigned = require("assignExpr");
const fsViaStaticModule = require("staticModule");

it("supports the external types usable in a universal ESM target", async () => {
	// node-commonjs: defensive createRequire, browser-safe at load
	expect(typeof fsViaNodeCommonjs.readFileSync).toBe("function");
	// var: plain expression external
	expect(sum).toBe(3);
	// assign: plain expression external
	expect(assigned).toBe(globalThis);
	// module: static ESM import (resolves a real module in node)
	expect(typeof fsViaStaticModule.readFileSync).toBe("function");
	// promise: awaited via ESM import
	expect(promiseVal).toBe(42);
	// import: dynamic import, stays lazy
	const os = await import("dynamicImport");
	expect(typeof os.platform).toBe("function");
});
