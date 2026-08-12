"use strict";

const {
	DEFERRED_FULL_HASH_PATH_DATA,
	canDeferFullHash,
	readSpecifier,
	reserveSpecifier
} = require("../lib/esm/AnalyzableChunkHashPlugin");
const lookalikes = require("./configCases/analyzable/stand-in-lookalike/lookalikes.json");

const PAYLOAD_REGEXP = /^\.\/@@webpackAnalyzableChunk:([\w-]+)@@$/;

// Stands for a payload that is not json at all — its bytes are not printable, and a
// snapshot of them would make git treat this file as binary.
const NOT_JSON = Symbol("not json");

/**
 * @param {string} specifier a reserved stand-in
 * @returns {string} its encoded half
 */
const payloadOf = (specifier) => {
	const match = PAYLOAD_REGEXP.exec(specifier);
	if (!match) throw new Error(`Not a stand-in: ${specifier}`);
	return match[1];
};

/**
 * @param {string} payload the encoded half of a stand-in
 * @returns {string} what it spells
 */
const decode = (payload) =>
	Buffer.from(
		payload.replace(/-/g, "+").replace(/_/g, "/"),
		"base64"
	).toString();

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

	describe("readSpecifier", () => {
		it("should read back every part kind as it was reserved", () => {
			/** @type {import("../lib/esm/AnalyzableChunkHashPlugin").SpecifierPart[]} */
			const parts = [
				["undo", "assets/"],
				["publicPath", ""],
				["template", "[fullhash]/"],
				["literal", "../a+b/c?d=e&f/"],
				["chunk", 12]
			];

			expect(readSpecifier(payloadOf(reserveSpecifier(parts)))).toEqual(parts);
		});

		it("should read an empty part list, which resolves to an empty name", () => {
			expect(readSpecifier(payloadOf(reserveSpecifier([])))).toEqual([]);
		});

		// Source of our own can spell the token, so every shape it does not produce has
		// to be refused rather than reached for — each one would throw further in.
		it("should refuse a payload it did not produce", () => {
			for (const [name, specifier] of Object.entries(lookalikes)) {
				// `unknownChunk` is well-formed: it is refused later, by chunk lookup.
				const expected = name === "unknownChunk" ? "read" : "refused";
				const read = readSpecifier(payloadOf(specifier));
				expect([name, read === null ? "refused" : "read"]).toEqual([
					name,
					expected
				]);
			}
		});

		// The case drives these through a real build, which cannot state what they mean.
		// Naming each one here keeps a payload-format change from leaving it testing
		// nothing: a blob that stopped spelling its own name would still reach the bundle.
		it("should carry the shape each lookalike is named for", () => {
			/** @type {Record<string, unknown>} */
			const decoded = {};
			for (const [name, specifier] of Object.entries(lookalikes)) {
				try {
					decoded[name] = JSON.parse(decode(payloadOf(specifier)));
				} catch (_error) {
					decoded[name] = NOT_JSON;
				}
			}

			expect(decoded).toEqual({
				notJson: NOT_JSON,
				notArray: { a: 1 },
				notTuples: ["literal", "x"],
				wrongLength: [["literal"]],
				unknownKind: [["nonsense", "x"]],
				wrongValueType: [["literal", { a: 1 }]],
				numericTemplate: [["template", 0]],
				numericLiteral: [["literal", 7]],
				unknownChunk: [["chunk", "no-such-chunk-id"]]
			});
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

	describe("DEFERRED_FULL_HASH_PATH_DATA", () => {
		// `TemplatedPathPlugin` reads `hash` for `[fullhash]` and calls `hashWithLength`
		// for `[fullhash:n]`, so both have to spell a stand-in the fill pass matches.
		it("should stand in for the compilation hash at any length", () => {
			expect(DEFERRED_FULL_HASH_PATH_DATA.hash).toBe("@@webpackFullHash@@");
			expect(DEFERRED_FULL_HASH_PATH_DATA.hashWithLength(8)).toBe(
				"@@webpackFullHash-8@@"
			);
		});

		it("should close over nothing, so one object serves every asset", () => {
			expect(DEFERRED_FULL_HASH_PATH_DATA.hashWithLength(8)).toBe(
				DEFERRED_FULL_HASH_PATH_DATA.hashWithLength(8)
			);
		});
	});
});
