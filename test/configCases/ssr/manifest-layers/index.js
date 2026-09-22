"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("keys the same file once per layer it is built in", () => {
	// one file in two layers is two modules emitting into different chunks
	expect(manifest["(one)./shared.js"]).toEqual(["one.js"]);
	expect(manifest["(two)./shared.js"]).toEqual(["two.js"]);
});

it("leaves an unlayered module keyed by its path alone", () => {
	expect(manifest["./index.js"]).toBeDefined();
});
