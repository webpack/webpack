import { createRequire as _createRequire } from "module";
import { createRequire as __createRequire, builtinModules } from "module";

it("should evaluate require/createRequire", () => {
	expect(
		(function() { return typeof _createRequire; }).toString()
	).toBe('function() { return "function"; }');
	expect(
		(function() { if (typeof _createRequire); }).toString()
	).toBe('function() { if (true); }');
	const require = __createRequire(import.meta.url);
	expect(
		(function() { return typeof require; }).toString()
	).toBe('function() { return "function"; }');
	expect(
		(function() { if (typeof require); }).toString()
	).toBe('function() { if (true); }');
});

it("should create require", () => {
	const require = _createRequire(import.meta.url);
	expect(require("./a")).toBe(1);
	expect(_createRequire(import.meta.url)("./c")).toBe(3);
});

it("should resolve using created require", () => {
	const require = _createRequire(import.meta.url);
	expect(require.resolve("./b")).toBe("./b.js");
	expect(_createRequire(import.meta.url).resolve("./b")).toBe("./b.js");
});

it("should provide require.cache", () => {
	const _require = _createRequire(import.meta.url);
	expect(require.cache).toBe(_require.cache);
	expect(require.cache).toBe(_createRequire(import.meta.url).cache);
});

it("should provide dependency context", () => {
	const _require = _createRequire(new URL("./foo/c.js", import.meta.url));
	expect(_require("./a")).toBe(4);
	const _require1 = _createRequire(new URL("./foo/", import.meta.url));
	expect(_require1("./c")).toBe(5);
});

it("should add warning on using as expression", () => {
	let _require = _createRequire(new URL("./foo/c.js", import.meta.url));
	const a = _require;
	expect(typeof a).toBe("function");
});

it("should add warning on using require.main", () => {
	let _require = _createRequire(new URL("./foo/c.js", import.meta.url));
	expect(_require.main).toBe(undefined);
});

it("should import Node.js module", () => {
	expect(Array.isArray(builtinModules)).toBe(true);
});
