"use strict";

it("adds the module request for a modules directory ending in a separator", () => {
	const context = require.context("./apps", true, /\.json$/);
	expect(context.keys().sort()).toEqual(["./blog.json", "blog.json"]);
	expect(context("blog.json")).toEqual({ name: "blog" });
});
