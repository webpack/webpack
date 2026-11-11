import { neverCalled } from "./rare";

it("should walk import().then() callbacks", async () => {
	const named = await import("./dir/a.js").then(function named(ns) {
		return typeof named === "function" && ns.name;
	});
	expect(named).toBe("a");
	const plain = await import("./dir/a.js").then();
	expect(plain.name).toBe("a");
	const destructured = await import("./dir/b.js").then(
		({ name }) => name,
		(error) => error
	);
	expect(destructured).toBe("b");
	const block = await import("./dir/a.js").then((ns) => {
		"use strict";
		return ns.name;
	});
	expect(block).toBe("a");
});

it("should read import() attributes", async () => {
	const data = await import("./data.json", { with: { type: "json" } });
	expect(data.default).toEqual({ value: 1 });
});

it("should read require.context and import.meta.webpackContext options", () => {
	const context = require.context("./dir", false, /\.js$/, "sync");
	expect(context.keys().sort()).toEqual(["./a.js", "./b.js"]);
	const webpackContext = import.meta.webpackContext("./dir", {
		recursive: false,
		regExp: /\.js$/,
		include: /\.js$/,
		exclude: /b\.js$/,
		mode: "sync"
	});
	expect(webpackContext.keys()).toEqual(["./a.js"]);
});

it("should read import.meta.glob options", () => {
	const modules = import.meta.glob(["./glob/*.js", "!./glob/two.js"], {
		"eager": true,
		import: "name",
		query: { raw: "", 1: true },
		exhaustive: false,
		caseSensitive: true
	});
	expect(Object.values(modules)).toEqual(["one"]);
});

it("should walk an AMD factory body with its directive", () => {
	const amd = require("./amd");
	expect(amd).toEqual({ name: "a" });
});

it("should keep the never-called constructs", () => {
	expect(typeof neverCalled).toBe("function");
});
