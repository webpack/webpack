import { pathToFileURL } from "url";
import path from "path";

const url = pathToFileURL(
	path.resolve("./test/configCases/parsing/import-meta-standalone/index.js")
).toString();
const webpackVersion = parseInt(
	// eslint-disable-next-line n/no-missing-require
	require("../../../../package.json").version,
	10
);

it("should preserve properties when import.meta is assigned to a variable", () => {
	const meta = import.meta;
	expect(meta.url).toBe(url);
	expect(meta.webpack).toBe(webpackVersion);
	expect(typeof meta.main).toBe("boolean");
	expect(typeof meta.env).toBe("object");
});

it("should preserve properties when import.meta is returned from a function", () => {
	function getMeta() {
		return import.meta;
	}
	const meta = getMeta();
	expect(meta.url).toBe(url);
	expect(meta.webpack).toBe(webpackVersion);
});

it("should preserve properties when import.meta is passed as an argument", () => {
	function readUrl(meta) {
		return meta.url;
	}
	expect(readUrl(import.meta)).toBe(url);
});

it("should return the same object for import.meta", () => {
	expect(import.meta).toBe(import.meta);
	const a = import.meta;
	const b = import.meta;
	expect(a).toBe(b);
});

it("should preserve runtime properties via Object.assign", () => {
	import.meta.CUSTOM_PROP = "custom";
	const meta = import.meta;
	expect(meta.CUSTOM_PROP).toBe("custom");
	expect(meta.url).toBe(url);
});
