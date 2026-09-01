"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("reaches a route nested two dynamic imports deep", async () => {
	const { loadInner } = await import("./outer");
	const { inner } = await loadInner();
	expect(inner()).toBe("inner");
});

it("lists the async ancestor a nested route is reached through", () => {
	const files = manifest["./inner.js"];
	expect(files).toBeDefined();
	// `outer` triggers the import of `inner`, so preloading only `inner` would
	// still leave the browser waiting on `outer`
	expect(files.some((file) => file.includes("outer"))).toBe(true);
	expect(files.some((file) => file.includes("inner"))).toBe(true);
});
