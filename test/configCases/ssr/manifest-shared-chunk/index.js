"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("loads both routes off the shared chunk", async () => {
	const [{ a }, { b }] = await Promise.all([import("./a"), import("./b")]);
	expect(a()).toBe("shared-a");
	expect(b()).toBe("shared-b");
});

it("lists the split-out chunk a route depends on", () => {
	const files = manifest["./a.js"];
	expect(files).toBeDefined();
	// without it the client would only discover `shared` after fetching the route
	expect(files.some((file) => file.includes("shared"))).toBe(true);
});

it("does not list the routes that merely import a shared chunk", () => {
	const files = manifest["./shared.js"];
	// the filter below passes on an empty list, so require the chunk first
	expect(files.some((file) => file.includes("shared"))).toBe(true);
	expect(files).toEqual(files.filter((file) => file.includes("shared")));
});
