it("error when lockfile is outdated/invalid", () => {
	expect(() => {
		require("http://localhost:9990/index.css?cache");
	}).toThrowError();
	expect(() => {
		require("http://localhost:9990/index.css?no-cache");
	}).toThrowError();
	expect(() => {
		require("http://localhost:9990/index.css");
	}).toThrowError();
	expect(() => {
		require("http://localhost:9990/resolve.js");
	}).toThrowError();
	expect(() => {
		require("http://localhost:9990/fallback.js");
	}).toThrowError();
	expect(() => {
		require("http://localhost:9990/redirect");
	}).toThrowError();
});

import text from "http://localhost:9990/asset.txt?ignore";

it("should allow to ignore lockfile entries", () => {
	expect(text.trim()).toBe("Hello World");
});

import cssContent from "http://localhost:9990/index.css?query#fragment";

it("should use the entry with query and fragment", () => {
	expect(cssContent).toBe("a {}.webpack{}");
});
