it("error when lockfile is outdated/invalid", () => {
	expect(() => {
		require("http://localhost:9990/index.css?cache");
	}).toThrow();
	expect(() => {
		require("http://localhost:9990/index.css?no-cache");
	}).toThrow();
	expect(() => {
		require("http://localhost:9990/index.css");
	}).toThrow();
	expect(() => {
		require("http://localhost:9990/resolve.js");
	}).toThrow();
	expect(() => {
		require("http://localhost:9990/fallback.js");
	}).toThrow();
	expect(() => {
		require("http://localhost:9990/redirect");
	}).toThrow();
});

import text from "http://localhost:9990/asset.txt?ignore";

it("should allow to ignore lockfile entries", () => {
	expect(text.trim()).toBe("Hello World");
});

import cssContent from "http://localhost:9990/index.css?query#fragment";

it("should use the entry with query and fragment", () => {
	expect(cssContent).toBe("a {}.webpack{}");
});
