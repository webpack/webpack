"use strict";

const {
	canDeferFullHash,
	reserveSpecifier
} = require("../lib/esm/AnalyzableChunkHashPlugin");

describe("AnalyzableChunkHashPlugin", () => {
	describe("reserveSpecifier", () => {
		// The stand-in sits in javascript source and is matched by `[\w-]+`, so anything
		// outside the url-safe alphabet would end the token early and reach the bundle.
		it("should encode a payload in the url-safe alphabet only", () => {
			const specifier = reserveSpecifier([
				["literal", "../a+b/c?d=e&f/"],
				["undo", ""],
				["template", "https://cdn.test/[fullhash:base64safe]/"],
				["publicPath", ""],
				["chunk", "ü-chunk/name"]
			]);

			expect(specifier).toMatch(/^\.\/@@webpackAnalyzableChunk:[\w-]+@@$/);
		});

		it("should look like a relative specifier, so nothing special-cases it", () => {
			expect(reserveSpecifier([["chunk", 0]]).startsWith("./")).toBe(true);
		});

		it("should carry a numeric chunk id apart from the same digits as a string", () => {
			expect(reserveSpecifier([["chunk", 12]])).not.toBe(
				reserveSpecifier([["chunk", "12"]])
			);
		});
	});

	describe("canDeferFullHash", () => {
		it("should accept a hash read as it is stored", () => {
			for (const template of [
				"[name].js",
				"[name].[fullhash].js",
				"[name].[fullhash:8].js",
				"[name].[contenthash:base64:8].js"
			]) {
				expect([template, canDeferFullHash(template)]).toEqual([
					template,
					true
				]);
			}
		});

		it("should refuse one that re-encodes it to another digest", () => {
			for (const template of [
				"[name].[fullhash:base64].js",
				"[name].[fullhash:base64safe].js",
				"[name].[hash:base36].js"
			]) {
				expect([template, canDeferFullHash(template)]).toEqual([
					template,
					false
				]);
			}
		});
	});
});
