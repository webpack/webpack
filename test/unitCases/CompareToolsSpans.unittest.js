"use strict";

const { spans } = require("../../tooling/compare-tools-harness");

/**
 * A walk over a literal tree, as the relation reads one: each node against the
 * one holding it and against how far the ones before it reached.
 * @param {EXPECTED_ANY} root the tree, `{ what, start, end, inner?, structural?, children? }`
 * @returns {(visit: (node: EXPECTED_ANY) => void) => void} the walk
 */
const walkOf = (root) => (visit) => {
	const descend = (/** @type {EXPECTED_ANY} */ node) => {
		let reached = -1;
		for (const child of node.children || []) {
			visit({
				what: child.what,
				start: child.start,
				end: child.end,
				parent: { what: node.what, start: node.start, end: node.end },
				after: reached,
				structural: child.structural,
				inner: child.inner
			});
			if (child.structural !== false) reached = Math.max(reached, child.end);
		}
		for (const child of node.children || []) descend(child);
	};
	descend(root);
};

/**
 * @param {EXPECTED_ANY} root the tree to hold
 * @param {{ contains?: boolean, siblings?: boolean, length?: number }=} options which parts are owed
 * @returns {string[]} what it broke, as the reported summaries
 */
const brokenBy = (root, options = {}) =>
	spans({
		length: options.length === undefined ? root.end : options.length,
		contains: options.contains !== false,
		siblings: options.siblings !== false,
		walk: walkOf(root)
	}).map((report) => report.what);

describe("the spans relation", () => {
	it("should report nothing about a tree whose ranges nest", () => {
		expect(
			brokenBy({
				what: "Rule",
				start: 0,
				end: 10,
				children: [
					{ what: "Ident", start: 0, end: 1 },
					{ what: "Block", start: 2, end: 10 }
				]
			})
		).toEqual([]);
	});

	it("should report a range that runs backwards", () => {
		expect(
			brokenBy({
				what: "Rule",
				start: 0,
				end: 10,
				children: [{ what: "Ident", start: 4, end: 2 }]
			})
		).toEqual(["inverted (Ident)"]);
	});

	it("should report a range reaching past the source", () => {
		expect(
			brokenBy(
				{
					what: "Rule",
					start: 0,
					end: 12,
					children: [{ what: "Ident", start: 8, end: 12 }]
				},
				{ length: 10 }
			)
		).toEqual(["ends past the source (Ident)"]);
	});

	it("should report a child that leaves the node holding it", () => {
		expect(
			brokenBy(
				{
					what: "Rule",
					start: 0,
					end: 6,
					children: [{ what: "Ident", start: 4, end: 9 }]
				},
				{ length: 9 }
			)
		).toEqual(["escapes parent (Ident in Rule)"]);
	});

	it("should report two siblings over the same bytes", () => {
		expect(
			brokenBy({
				what: "Rule",
				start: 0,
				end: 10,
				children: [
					{ what: "Ident", start: 0, end: 5 },
					{ what: "Ident", start: 3, end: 8 }
				]
			})
		).toEqual(["overlaps an earlier sibling (Ident)"]);
	});

	it("should report a sub-range outside the node that names it", () => {
		expect(
			brokenBy({
				what: "Rule",
				start: 0,
				end: 10,
				children: [
					{ what: "Declaration", start: 2, end: 8, inner: [["name", 2, 9]] }
				]
			})
		).toEqual(["name outside its node (Declaration)"]);
	});

	it("should read a sub-range of -1 as one the node does not have", () => {
		expect(
			brokenBy({
				what: "Rule",
				start: 0,
				end: 10,
				children: [
					{ what: "AtRule", start: 2, end: 8, inner: [["block", -1, -1]] }
				]
			})
		).toEqual([]);
	});

	it("should hold a node the walk never placed to its own offsets only", () => {
		const comment = {
			what: "Comment",
			start: 1,
			end: 4,
			structural: false,
			inner: [["name", 0, 9]]
		};
		expect(
			brokenBy({
				what: "Rule",
				start: 6,
				end: 10,
				children: [comment]
			})
		).toEqual(["name outside its node (Comment)"]);
	});

	it("should ask nothing about where a node sits when it is not owed", () => {
		const tree = {
			what: "Element",
			start: 0,
			end: 6,
			children: [
				{ what: "Element", start: 6, end: 12 },
				{ what: "Element", start: 8, end: 20 }
			]
		};
		expect(brokenBy(tree, { length: 20 })).toEqual([
			"escapes parent (Element in Element)",
			"escapes parent (Element in Element)",
			"overlaps an earlier sibling (Element)"
		]);
		expect(
			brokenBy(tree, { contains: false, siblings: false, length: 20 })
		).toEqual([]);
	});
});
