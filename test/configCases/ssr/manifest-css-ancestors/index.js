"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("reaches the innermost route", async () => {
	const { loadMiddle } = await import(
		/* webpackChunkName: "outer" */ "./outer"
	);
	const { loadInner } = await loadMiddle();
	const { inner } = await loadInner();
	expect(inner()).toBe("inner");
});

it("lists the stylesheets of the ancestors a route is reached through", () => {
	const stylesheets = manifest["./inner.js"].filter((file) =>
		file.endsWith(".css")
	);

	// the render needs its own sheet and both ancestors', or the markup the
	// server sends is styled by whichever of them the browser happens to have
	expect(stylesheets).toContain("inner.css");
	expect(stylesheets).toContain("middle.css");
	expect(stylesheets).toContain("outer.css");
});

it("orders the ancestors' stylesheets deterministically", () => {
	const stylesheets = manifest["./inner.js"].filter((file) =>
		file.endsWith(".css")
	);

	// An ancestor's css modules are not in this route's chunk group, so the
	// cascade cannot place them; name and id order keeps the manifest stable.
	expect(stylesheets.indexOf("middle.css")).toBeLessThan(
		stylesheets.indexOf("outer.css")
	);
});
