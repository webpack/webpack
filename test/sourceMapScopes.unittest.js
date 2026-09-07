"use strict";

const {
	addScopesToSourceMap,
	collectSourceScopes,
	encodeScopes
} = require("../lib/util/sourceMapScopes");

describe("sourceMapScopes", () => {
	describe("collectSourceScopes", () => {
		it("groups the segments of one source into a single range", () => {
			// Two generated lines, both mapping to source 0.
			const scopes = collectSourceScopes("AAAA;AACA", 1);

			expect(scopes).toHaveLength(1);
			expect(scopes[0].sourceIndex).toBe(0);
			expect(scopes[0].rangeStarts).toEqual([{ line: 0, column: 0 }]);
			expect(scopes[0].rangeEnds).toEqual([{ line: 2, column: 0 }]);
			expect(scopes[0].originalEnd).toEqual({ line: 2, column: 0 });
		});

		it("opens a second range when another source interrupts the first", () => {
			// Source 0, then source 1, then source 0 again, one per line.
			/* cspell:disable-next-line */
			const scopes = collectSourceScopes("AAAA;ACAA;ADAA", 2);

			expect(scopes).toHaveLength(2);
			expect(scopes[0].rangeStarts).toEqual([
				{ line: 0, column: 0 },
				{ line: 2, column: 0 }
			]);
			expect(scopes[0].rangeEnds).toEqual([
				{ line: 1, column: 0 },
				{ line: 3, column: 0 }
			]);
			expect(scopes[1].rangeStarts).toEqual([{ line: 1, column: 0 }]);
			expect(scopes[1].rangeEnds).toEqual([{ line: 2, column: 0 }]);
		});

		it("ends a range at a segment that names no source", () => {
			const scopes = collectSourceScopes("AAAA;A;AAAA", 1);

			expect(scopes[0].rangeStarts).toHaveLength(2);
			expect(scopes[0].rangeEnds[0]).toEqual({ line: 1, column: 0 });
		});

		it("stops at a digit outside the alphabet rather than misplacing the rest", () => {
			expect(collectSourceScopes("AAAA;!!!", 1)).toHaveLength(1);
		});
	});

	describe("encodeScopes", () => {
		// Verified byte for byte against @chrome-devtools/source-map-scopes-codec,
		// the reference implementation of the proposal.
		it("encodes scopes, ranges and bindings", () => {
			const names = ["preexisting"];
			const encoded = encodeScopes(
				[
					{
						sourceIndex: 0,
						variables: ["counter", "bump"],
						values: ["_m0.counter", "_m0.bump"],
						originalEnd: { line: 7, column: 0 },
						rangeStarts: [
							{ line: 10, column: 0 },
							{ line: 22, column: 9 }
						],
						rangeEnds: [
							{ line: 14, column: 0 },
							{ line: 23, column: 0 }
						]
					},
					{
						sourceIndex: 2,
						variables: ["value"],
						values: ["_m1.value"],
						originalEnd: { line: 3, column: 0 },
						rangeStarts: [{ line: 20, column: 4 }],
						rangeEnds: [{ line: 22, column: 9 }]
					}
				],
				3,
				names
			);

			/* cspell:disable */
			const expected =
				"BCAAC,DEC,CHA,A,BCAAA,DC,CDA,EDKAA,GGH,FEA,EDGEC,GI,FCJ,ECAD,GGH,FBA";
			/* cspell:enable */
			expect(encoded).toBe(expected);
			expect(names).toEqual([
				"preexisting",
				"Module",
				"counter",
				"bump",
				"value",
				"_m0.counter",
				"_m0.bump",
				"_m1.value"
			]);
		});

		it("marks a source with no bindings as empty", () => {
			/** @type {string[]} */
			const names = [];
			const encoded = encodeScopes(
				[
					{
						sourceIndex: 1,
						variables: ["a"],
						values: ["m.a"],
						originalEnd: { line: 1, column: 0 },
						rangeStarts: [{ line: 0, column: 0 }],
						rangeEnds: [{ line: 1, column: 0 }]
					}
				],
				2,
				names
			);

			expect(encoded.startsWith("A,")).toBe(true);
		});
	});

	describe("addScopesToSourceMap", () => {
		/**
		 * @returns {import("../lib/util/sourceMapScopes").ScopedSourceMap} a two-source map
		 */
		const map = () => ({
			version: 3,
			file: "bundle.js",
			sources: ["a.js", "b.js"],
			/** @type {string[]} */
			names: [],
			/* cspell:disable-next-line */
			mappings: "AAAA;ACAA"
		});

		it("adds the field and extends names", () => {
			const sourceMap = map();
			addScopesToSourceMap(sourceMap, (sourceIndex) =>
				sourceIndex === 0 ? new Map([["foo", "_a.foo"]]) : undefined
			);

			expect(typeof sourceMap.scopes).toBe("string");
			expect(sourceMap.names).toEqual(["Module", "foo", "_a.foo"]);
		});

		it("leaves a map alone when no source contributes a binding", () => {
			const sourceMap = map();
			addScopesToSourceMap(sourceMap, () => new Map());

			expect(sourceMap.scopes).toBeUndefined();
			expect(sourceMap.names).toEqual([]);
		});

		it("leaves a map without mappings alone", () => {
			const sourceMap = { ...map(), mappings: "" };
			addScopesToSourceMap(sourceMap, () => new Map([["foo", "_a.foo"]]));

			expect(sourceMap.scopes).toBeUndefined();
		});
	});
});
