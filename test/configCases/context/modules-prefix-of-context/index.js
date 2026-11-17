"use strict";

it("adds no request for a context only sharing a prefix with a modules directory", () => {
	const context = require.context("./apps", true, /\.json$/);
	expect(context.keys()).toEqual(["./blog.json"]);
	expect(context("./blog.json")).toEqual({ name: "blog" });
});
