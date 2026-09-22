"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("keeps the cascade when the stylesheet extension is not .css", () => {
	const files = manifest["./page.js"];
	expect(files).toBeDefined();

	const stylesheets = files.filter((file) => file.endsWith(".stylesheet"));

	// sorting these by name would put alpha first, losing the import order
	expect(stylesheets).toEqual(["page.stylesheet", "alpha.stylesheet"]);
});

it("loads the route at runtime", () =>
	import(/* webpackChunkName: "page" */ "./page.js").then((m) => {
		expect(m.render()).toBe("page");
	}));
