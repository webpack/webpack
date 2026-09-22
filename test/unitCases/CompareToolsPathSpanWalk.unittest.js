"use strict";

const { pathSpanWalk } = require("../../tooling/compare-tools-harness");

/**
 * A parser whose walk is scripted rather than parsed: each step is the node to
 * enter, or `null` to leave the one it is standing on. A node's range is read
 * on the way out, which is what the relation has to be driven through.
 * @param {number} length the source's length
 * @param {(string | null)[]} steps what the walk does
 * @param {Record<string, [number, number]>} ranges each node's settled range
 * @param {Record<string, [string, number, number][]>=} inner each node's sub-ranges
 * @returns {EXPECTED_ANY[]} the span nodes it hands over
 */
const walked = (length, steps, ranges, inner = {}) => {
	/** @type {string[]} */
	const standing = [];
	/** @type {EXPECTED_ANY[]} */
	const out = [];
	pathSpanWalk({
		length,
		run: (enter, exit) => {
			for (const step of steps) {
				if (step === null) {
					// The accessor answers for the node being left, which is the one
					// the walk is standing on.
					exit(/** @type {EXPECTED_ANY} */ (standing.pop()));
					continue;
				}
				standing.push(step);
				enter(/** @type {EXPECTED_ANY} */ (step));
			}
		},
		name: (node) => String(node),
		start: (node) => ranges[String(node)][0],
		end: (node) => ranges[String(node)][1],
		inner: (node) => inner[String(node)],
		structural: (node) => String(node) !== "Comment"
	})((node) => out.push(node));
	return out;
};

describe("the span walk over an accessor-based parser", () => {
	it("should read every node against the one it sat in", () => {
		expect(
			walked(
				10,
				["Rule", "Ident", null, "Block", null, null],
				{ Rule: [0, 10], Ident: [0, 1], Block: [2, 10] }
			).map((node) => [node.what, node.parent.what, node.start, node.end])
		).toEqual([
			["Ident", "Rule", 0, 1],
			["Block", "Rule", 2, 10],
			["Rule", "source", 0, 10]
		]);
	});

	it("should read a range on the way out, not on the way in", () => {
		// The parsers stream: an at-rule is entered holding its prelude and has
		// its end set once the body is read, so entering settles nothing.
		const [child, node] = walked(
			32,
			["AtRule", "Rule", null, null],
			{ AtRule: [0, 32], Rule: [11, 30] }
		);
		expect([child.start, child.end]).toEqual([11, 30]);
		expect([node.start, node.end]).toEqual([0, 32]);
	});

	it("should read siblings in source order, not in visit order", () => {
		// CSS consumes a block into separate declaration and child-rule lists, so
		// a rule written between two declarations is walked after both.
		expect(
			walked(
				20,
				["Rule", "First", null, "Third", null, "Second", null, null],
				{
					Rule: [0, 20],
					First: [1, 5],
					Second: [6, 10],
					Third: [11, 15]
				}
			).map((node) => [node.what, node.after])
		).toEqual([
			["First", -1],
			["Second", 5],
			["Third", 10],
			["Rule", -1]
		]);
	});

	it("should let a node it never placed move no sibling mark", () => {
		expect(
			walked(
				20,
				["Rule", "Comment", null, "Ident", null, null],
				{ Rule: [0, 20], Comment: [1, 9], Ident: [2, 6] }
			).map((node) => [node.what, node.structural, node.after])
		).toEqual([
			["Comment", false, -1],
			["Ident", true, -1],
			["Rule", true, -1]
		]);
	});

	it("should hand over the sub-ranges a node states", () => {
		expect(
			walked(
				10,
				["Declaration", null],
				{ Declaration: [0, 8] },
				{ Declaration: [["name", 0, 3]] }
			)[0].inner
		).toEqual([["name", 0, 3]]);
	});

	it("should keep the root when a walk leaves more than it entered", () => {
		// The guard is what stops every later node being read against nothing.
		expect(
			walked(
				10,
				["A", null, null, "B", null],
				{ A: [0, 4], B: [5, 9] }
			).map((node) => [node.what, node.parent.what])
		).toEqual([
			["A", "source"],
			["B", "source"]
		]);
	});
});
