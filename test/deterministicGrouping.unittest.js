"use strict";

const deterministicGrouping = require("../lib/util/deterministicGrouping");

describe("deterministicGrouping", () => {
	const group = (
		/** @type {Record<string, number>[]} */ items,
		/** @type {Record<string, number>} */ minSize,
		/** @type {Record<string, number>} */ maxSize
	) =>
		deterministicGrouping({
			items: items.map(
				(/** @type {Record<string, number>} */ item, /** @type {number} */ i) =>
					/** @type {[number, Record<string, number>]} */ ([i, item])
			),
			minSize,
			maxSize,
			getKey: (/** @type {[number, Record<string, number>]} */ [key]) =>
				`${100000 + key}`,
			getSize: (/** @type {[number, Record<string, number>]} */ [, size]) =>
				size
		}).map((group) => ({
			items: group.items.map(
				(/** @type {[number, Record<string, number>]} */ [i]) => i
			),
			size: group.size
		}));

	it("should split large chunks with different size types", () => {
		expect(
			group(
				[{ a: 3, b: 3 }, { b: 1 }, { a: 3 }],
				{
					a: 3,
					b: 3
				},
				{
					a: 5,
					b: 5
				}
			)
		).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "items": Array [
		      0,
		      1,
		    ],
		    "size": Object {
		      "a": 3,
		      "b": 4,
		    },
		  },
		  Object {
		    "items": Array [
		      2,
		    ],
		    "size": Object {
		      "a": 3,
		    },
		  },
		]
	`);
	});

	it("should separate items with different size types when unsplittable", () => {
		expect(
			group(
				[
					{ a: 1 },
					{ b: 1 },
					{ a: 1 },
					{ a: 1 },
					{ b: 1 },
					{ a: 1 },
					{ a: 1 },
					{ b: 1 },
					{ a: 1 },
					{ a: 1 }
				],
				{
					a: 3,
					b: 3
				},
				{
					a: 5,
					b: 5
				}
			)
		).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "items": Array [
		      0,
		      2,
		      3,
		    ],
		    "size": Object {
		      "a": 3,
		    },
		  },
		  Object {
		    "items": Array [
		      1,
		      4,
		      7,
		    ],
		    "size": Object {
		      "b": 3,
		    },
		  },
		  Object {
		    "items": Array [
		      5,
		      6,
		      8,
		      9,
		    ],
		    "size": Object {
		      "a": 4,
		    },
		  },
		]
	`);
	});

	it("should handle entangled size types (case 1)", () => {
		expect(
			group(
				[
					{ c: 2, b: 2 },
					{ a: 2, c: 2 },
					{ a: 2, b: 2 }
				],
				{
					a: 3,
					b: 3,
					c: 3
				},
				{
					a: 3,
					b: 3,
					c: 3
				}
			)
		).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "items": Array [
		      0,
		      1,
		      2,
		    ],
		    "size": Object {
		      "a": 4,
		      "b": 4,
		      "c": 4,
		    },
		  },
		]
	`);
	});

	it("should handle entangled size types (case 2)", () => {
		expect(
			group(
				[
					{ c: 2, b: 2 },
					{ a: 2, c: 2 },
					{ a: 2, b: 2 }
				],
				{
					a: 3,
					b: 3
				},
				{
					c: 3
				}
			)
		).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "items": Array [
		      0,
		      2,
		    ],
		    "size": Object {
		      "a": 2,
		      "b": 4,
		      "c": 2,
		    },
		  },
		  Object {
		    "items": Array [
		      1,
		    ],
		    "size": Object {
		      "a": 2,
		      "c": 2,
		    },
		  },
		]
	`);
	});
});
