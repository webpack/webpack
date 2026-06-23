"use strict";

const { getPresentKinds, interpolate } = require("../lib/TemplatedPathPlugin");

describe("TemplatedPathPlugin.getPresentKinds", () => {
	it("reports the placeholder kinds a template references, ignoring args", () => {
		const kinds = getPresentKinds("[name].[contenthash:base64:8].js");
		expect(kinds.has("name")).toBe(true);
		expect(kinds.has("contenthash")).toBe(true);
		expect(kinds.has("fullhash")).toBe(false);
	});

	it("returns an empty set for literal templates", () => {
		expect(getPresentKinds("static/main.js").size).toBe(0);
	});
});

describe("TemplatedPathPlugin.interpolate", () => {
	it("returns literal paths unchanged", () => {
		expect(interpolate("static/main.js", {})).toBe("static/main.js");
	});

	it("resolves a TemplatePathFn before interpolating", () => {
		expect(interpolate((data) => `${data.url}.js`, { url: "x" })).toBe("x.js");
	});

	it("interpolates filename placeholders", () => {
		const data = { filename: "/a/b/file.js?q=1#frag" };
		expect(interpolate("[path][name][ext]", data)).toBe("/a/b/file.js");
		expect(interpolate("[base]", data)).toBe("file.js");
		expect(interpolate("[query]", data)).toBe("?q=1");
		expect(interpolate("[fragment]", data)).toBe("#frag");
		expect(interpolate("[file]", data)).toBe("/a/b/file.js");
	});

	it("interpolates data-uri filename placeholders", () => {
		const data = { filename: "data:image/png;base64,AAAA" };
		expect(interpolate("[ext]", data)).toBe(".png");
		expect(interpolate("[base][query][fragment][path]", data)).toBe("");
		// unknown mime type yields an empty [ext]
		expect(interpolate("[ext]", { filename: "data:weird/x,AA" })).toBe("");
	});

	it("supports the legacy [filebase] placeholder", () => {
		expect(interpolate("[filebase]", { filename: "/a/file.js" })).toBe(
			"file.js"
		);
		expect(
			interpolate("[filebase]", { filename: "data:image/png;base64,AA" })
		).toBe("");
	});

	it("interpolates [fullhash] and legacy [hash]", () => {
		const data = { hash: "0123456789abcdef" };
		expect(interpolate("[fullhash]", data)).toBe("0123456789abcdef");
		expect(interpolate("[fullhash:4]", data)).toBe("0123");
		expect(interpolate("[hash]", data)).toBe("0123456789abcdef");
	});

	/* cSpell:disable */
	it("re-encodes a hash placeholder to an inline digest", () => {
		const data = { hash: "0123456789abcdef" };
		// [<kind>:<digest>] and [<kind>:<digest>:<length>]
		expect(interpolate("[fullhash:base64]", data)).toBe("ASNFZ4mrze8=");
		expect(interpolate("[fullhash:base64url]", data)).toBe("ASNFZ4mrze8");
		expect(interpolate("[fullhash:base32]", data)).toBe("CI2FM6E2XTPP");
		expect(interpolate("[fullhash:base62]", data)).toBe("63uFdvrkbZ");
		expect(interpolate("[fullhash:base64:4]", data)).toBe("ASNF");
		// [<kind>:<length>] and [<kind>] keep their existing meaning
		expect(interpolate("[fullhash:4]", data)).toBe("0123");
		expect(interpolate("[fullhash]", data)).toBe("0123456789abcdef");
		// honours a non-default source digest
		expect(
			interpolate("[fullhash:hex]", {
				hash: "ASNFZ4mrze8",
				hashDigest: "base64url"
			})
		).toBe("0123456789abcdef");
	});
	/* cSpell:enable */

	it("throws on an unknown inline digest", () => {
		expect(() =>
			interpolate("[fullhash:base40]", { hash: "0123456789abcdef" })
		).toThrow(/Unsupported hash digest "base40"/);
		expect(() =>
			interpolate("[fullhash:nope:8]", { hash: "0123456789abcdef" })
		).toThrow(/Unsupported hash digest "nope"/);
	});

	it("interpolates chunk placeholders", () => {
		const data = {
			chunk: {
				id: "7",
				name: "app",
				hash: "1122334455",
				contentHash: { javascript: "9988776655" }
			},
			contentHashType: "javascript"
		};
		expect(interpolate("[id]", data)).toBe("7");
		expect(interpolate("[name]", data)).toBe("app");
		expect(interpolate("[chunkhash]", data)).toBe("1122334455");
		expect(interpolate("[contenthash:4]", data)).toBe("9988");
		// chunk name falls back to id when unnamed
		expect(
			interpolate(
				"[name]",
				/** @type {EXPECTED_ANY} */ ({ chunk: { id: "9" } })
			)
		).toBe("9");
	});

	it("interpolates module placeholders incl. legacy aliases", () => {
		const data = { module: { id: "42", hash: "9876543210" } };
		expect(interpolate("[id]", data)).toBe("42");
		expect(interpolate("[moduleid]", data)).toBe("42");
		expect(interpolate("[modulehash:3]", data)).toBe("987");
		expect(interpolate("[hash]", data)).toBe("9876543210");
		// `[hash]` aliases the content hash when present
		expect(
			interpolate("[hash]", {
				module: { id: "1", hash: "h" },
				contentHash: "c"
			})
		).toBe("c");
	});

	it("interpolates [url] and [runtime]", () => {
		expect(interpolate("[url]", { url: "u" })).toBe("u");
		expect(interpolate("[runtime]", { runtime: "main" })).toBe("main");
		// non-string runtime collapses to "_"
		expect(
			interpolate(
				"[runtime]",
				/** @type {EXPECTED_ANY} */ ({ runtime: ["a", "b"] })
			)
		).toBe("_");
	});

	it("interpolates [uniqueName] and its [uniquename] alias", () => {
		const data = { uniqueName: "my-app" };
		expect(interpolate("[uniqueName].js", data)).toBe("my-app.js");
		expect(interpolate("[uniquename].js", data)).toBe("my-app.js");
		expect(interpolate("[uniqueName]", { uniqueName: "" })).toBe("");
		// left untouched when no uniqueName is provided
		expect(interpolate("[uniqueName]", {})).toBe("[uniqueName]");
	});

	it("unescapes bracket-escaped placeholders", () => {
		expect(interpolate("[\\name\\]", {})).toBe("[name]");
	});

	it("records hashes into assetInfo, accumulating repeats", () => {
		const assetInfo = {};
		interpolate("[contenthash]", {
			module: { id: "1", hash: "h" },
			contentHash: "c1"
		});
		const info = { contenthash: "old" };
		interpolate(
			"[contenthash]",
			{ module: { id: "1", hash: "h" }, contentHash: "c2" },
			info
		);
		expect(info.contenthash).toEqual(["old", "c2"]);
		const arrInfo = { contenthash: ["x"] };
		interpolate(
			"[contenthash]",
			{ module: { id: "1", hash: "h" }, contentHash: "c3" },
			arrInfo
		);
		expect(arrInfo.contenthash).toEqual(["x", "c3"]);
		expect(assetInfo).toEqual({});
	});

	it("clears the bounded present-kinds cache past its limit", () => {
		// Exceed PRESENT_KINDS_CACHE_MAX (1000) distinct templates so the cache
		// clear branch runs; results must still be correct afterwards.
		for (let i = 0; i < 1100; i++) {
			expect(interpolate(`a${i}[name]`, { filename: "x.js" })).toBe(`a${i}x`);
		}
	});
});
