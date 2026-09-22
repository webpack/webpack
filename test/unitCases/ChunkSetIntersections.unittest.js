"use strict";

const {
	discoverIntersections
} = require("../../lib/optimize/chunkSetIntersections");

/**
 * Counts the bits of a number.
 * @param {number} value the number
 * @returns {number} how many bits are set
 */
const popcountOf = (value) => {
	let count = 0;
	for (let bit = value; bit !== 0; bit >>= 1) count += bit & 1;
	return count;
};

/**
 * Runs discovery over sets written as member lists.
 * @param {number[][]} sets the sets to intersect
 * @param {object} options the rest of the discovery options
 * @param {number=} options.depth rounds of discovery
 * @param {number=} options.minMembers smallest intersection to report
 * @param {number[]=} options.sizes size of each set
 * @param {number=} options.minSize size the support of an intersection must reach
 * @param {number=} options.maxIntersections most intersections to discover
 * @param {number=} options.maxWork most words to intersect
 * @returns {{ intersections: { members: number[], support: number[] }[], capped: boolean }} what discovery found
 */
const discover = (
	sets,
	{
		depth = 1,
		minMembers = 2,
		sizes,
		minSize = 0,
		maxIntersections = 1000,
		maxWork = 1000000
	} = {}
) => {
	const offsets = new Int32Array(sets.length + 1);
	let memberCount = 0;
	/** @type {number[]} */
	const flattened = [];
	for (let i = 0; i < sets.length; i++) {
		offsets[i + 1] = offsets[i] + sets[i].length;
		for (const member of sets[i]) {
			memberCount = Math.max(memberCount, member + 1);
			flattened.push(member);
		}
	}
	return discoverIntersections({
		setCount: sets.length,
		memberCount,
		offsets,
		members: new Int32Array(flattened),
		depth,
		minMembers,
		sizes: sizes === undefined ? undefined : new Float64Array(sizes),
		minSize,
		maxIntersections,
		maxWork
	});
};

describe("chunkSetIntersections", () => {
	it("should find what two sets share", () => {
		const { intersections, capped } = discover([
			[0, 1, 2],
			[0, 1, 3]
		]);
		expect(capped).toBe(false);
		expect(intersections).toEqual([{ members: [0, 1], support: [0, 1] }]);
	});

	it("should report every set holding an intersection", () => {
		const { intersections } = discover([
			[0, 1, 2],
			[0, 1, 3],
			[0, 1, 2, 3, 4]
		]);
		expect(intersections).toEqual([{ members: [0, 1], support: [0, 1, 2] }]);
	});

	it("should skip an intersection of fewer members than asked for", () => {
		expect(
			discover([
				[0, 1, 2],
				[2, 3, 4]
			]).intersections
		).toEqual([]);
		expect(
			discover(
				[
					[0, 1, 2],
					[2, 3, 4]
				],
				{ minMembers: 1 }
			).intersections
		).toEqual([{ members: [2], support: [0, 1] }]);
	});

	it("should skip an intersection that is one of the sets", () => {
		expect(
			discover([
				[0, 1, 2],
				[0, 1, 2, 3]
			]).intersections
		).toEqual([]);
	});

	it("should report an intersection once, however many pairs reach it", () => {
		const { intersections } = discover([
			[0, 1, 2],
			[0, 1, 3],
			[0, 1, 4]
		]);
		expect(intersections).toEqual([
			{ members: [0, 1], support: [0, 1, 2] }
		]);
	});

	it("should take another round to intersect what a round found", () => {
		const sets = [
			[0, 1, 2, 3],
			[0, 1, 3, 4],
			[0, 1, 4, 2]
		];
		expect(discover(sets, { depth: 1 }).intersections).toEqual([
			{ members: [0, 1, 2], support: [0, 2] },
			{ members: [0, 1, 3], support: [0, 1] },
			{ members: [0, 1, 4], support: [1, 2] }
		]);
		expect(discover(sets, { depth: 2 }).intersections).toEqual([
			{ members: [0, 1, 2], support: [0, 2] },
			{ members: [0, 1, 3], support: [0, 1] },
			{ members: [0, 1, 4], support: [1, 2] },
			{ members: [0, 1], support: [0, 1, 2] }
		]);
		expect(discover(sets, { depth: 3 }).intersections).toEqual(
			discover(sets, { depth: 2 }).intersections
		);
	});

	it("should report the widest intersections first", () => {
		const { intersections } = discover(
			[
				[0, 1, 2, 3],
				[0, 1, 2, 4],
				[0, 1, 5],
				[0, 1, 6]
			],
			{ depth: 2 }
		);
		expect(intersections.map((intersection) => intersection.members)).toEqual([
			[0, 1, 2],
			[0, 1]
		]);
	});

	it("should not look for intersections without two sets to intersect", () => {
		expect(discover([[0, 1, 2]]).intersections).toEqual([]);
		expect(discover([]).intersections).toEqual([]);
	});

	it("should not look for intersections at depth zero", () => {
		expect(
			discover(
				[
					[0, 1, 2],
					[0, 1, 3]
				],
				{ depth: 0 }
			).intersections
		).toEqual([]);
	});

	describe("with a size bound", () => {
		it("should keep an intersection its sets can fill", () => {
			const { intersections } = discover(
				[
					[0, 1, 2],
					[0, 1, 3]
				],
				{ sizes: [10, 10], minSize: 15 }
			);
			expect(intersections).toEqual([{ members: [0, 1], support: [0, 1] }]);
		});

		it("should drop an intersection no set of it can fill", () => {
			expect(
				discover(
					[
						[0, 1, 2],
						[0, 1, 3],
						[2, 3, 4, 5],
						[2, 3, 4, 6]
					],
					{ sizes: [1, 1, 40, 40], minSize: 15 }
				).intersections
			).toEqual([{ members: [2, 3, 4], support: [2, 3] }]);
		});

		it("should skip a pair sharing a member no set can fill", () => {
			// Every pair shares one of the poor members 2, 3 and 4, so the last
			// round skips all three pairs; a round before it finds {0,1} instead.
			const sets = [
				[0, 1, 3, 4],
				[0, 1, 2, 4],
				[0, 1, 2, 3]
			];
			const sizes = [1, 1, 1];
			expect(discover(sets, { sizes, minSize: 3 }).intersections).toEqual([]);
			expect(
				discover(sets, { sizes, minSize: 3, depth: 2 }).intersections
			).toEqual([{ members: [0, 1], support: [0, 1, 2] }]);
		});

		it("should look for nothing when no set reaches the size together", () => {
			expect(
				discover(
					[
						[0, 1, 2],
						[0, 1, 3]
					],
					{ sizes: [10, 10], minSize: 25 }
				).intersections
			).toEqual([]);
		});
	});

	describe("at a limit", () => {
		const sets = [
			[0, 1, 2, 3],
			[0, 1, 3, 4],
			[0, 1, 4, 2]
		];

		it("should report being cut short by the work it may spend", () => {
			const { intersections, capped } = discover(sets, { maxWork: 1 });
			expect(capped).toBe(true);
			expect(intersections).toHaveLength(1);
		});

		it("should report being cut short by intersections", () => {
			const { intersections, capped } = discover(sets, {
				maxIntersections: 2
			});
			expect(capped).toBe(true);
			expect(intersections).toHaveLength(2);
		});

		it("should report nothing at a limit of none", () => {
			const { intersections, capped } = discover(sets, {
				maxIntersections: 0
			});
			expect(capped).toBe(true);
			expect(intersections).toEqual([]);
		});
	});

	it("should find a single member intersection when one is enough", () => {
		const sets = [
			[0, 1],
			[0, 2]
		];
		expect(discover(sets).intersections).toEqual([]);
		expect(discover(sets, { minMembers: 1 }).intersections).toEqual([
			{ members: [0], support: [0, 1] }
		]);
	});

	describe("over many sets", () => {
		// Pairs of blocks: two sets sharing a block intersect to it. Each member
		// is held by few sets, so the pairs are reached through the members.
		const blockCount = 12;
		/** @type {number[][]} */
		const blockPairs = [];
		for (let first = 0; first < blockCount; first++) {
			for (let second = first + 1; second < blockCount; second++) {
				blockPairs.push([
					first * 2,
					first * 2 + 1,
					second * 2,
					second * 2 + 1
				]);
			}
		}

		it("should reach a pair through the member they share", () => {
			const { intersections, capped } = discover(blockPairs);
			expect(capped).toBe(false);
			expect(intersections).toHaveLength(blockCount);
			for (const { members, support } of intersections) {
				expect(members).toHaveLength(2);
				expect(members[1]).toBe(members[0] + 1);
				expect(support).toHaveLength(blockCount - 1);
			}
		});

		it("should leave out a set holding one member of an intersection", () => {
			// Each of these holds one member of the first block and nothing else of
			// it, so the support scan reaches them and drops them again
			const sets = [...blockPairs, [0, 100, 101], [1, 102, 103]];
			const { intersections } = discover(sets);
			const first = intersections.find(
				(intersection) =>
					intersection.members.length === 2 && intersection.members[0] === 0
			);
			expect(first).toEqual({
				members: [0, 1],
				support: blockPairs
					.map((_, index) => index)
					.filter((index) => blockPairs[index].includes(0))
			});
		});

		it("should skip a pair a round before it already intersected", () => {
			const { intersections, capped } = discover(blockPairs, { depth: 2 });
			expect(capped).toBe(false);
			// A block is all two of these sets share, so a second round adds nothing
			expect(intersections).toHaveLength(blockCount);
		});

		it("should report being cut short of a member's pairs", () => {
			const { intersections, capped } = discover(blockPairs, { maxWork: 8 });
			expect(capped).toBe(true);
			expect(intersections.length).toBeLessThan(blockCount);
		});

		it("should hold more intersections than the sets it started from", () => {
			// Every five of eight members, so a round finds every smaller subset —
			// more patterns than the table was opened for
			/** @type {number[][]} */
			const sets = [];
			for (let mask = 0; mask < 256; mask++) {
				if (popcountOf(mask) !== 5) continue;
				sets.push(
					[0, 1, 2, 3, 4, 5, 6, 7].filter((member) => (mask >> member) & 1)
				);
			}
			expect(sets).toHaveLength(56);
			const { intersections, capped } = discover(sets, {
				depth: 1,
				maxIntersections: 1000
			});
			expect(capped).toBe(false);
			// Every subset of two, three and four of the eight members
			expect(intersections).toHaveLength(154);
			expect(new Set(intersections.map((i) => i.members.join(","))).size).toBe(
				154
			);
		});
	});

	it("should hold intersections of more members than a word", () => {
		const wide = Array.from({ length: 70 }, (_, i) => i);
		const { intersections } = discover([
			[...wide, 70],
			[...wide, 71]
		]);
		expect(intersections).toEqual([{ members: wide, support: [0, 1] }]);
	});
});
