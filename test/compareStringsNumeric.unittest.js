const { compareStringsNumeric } = require("../lib/util/comparators.js");

/**
 * @param {string} a string
 * @param {string} b string
 * @returns {-1|0|1} compare result
 */
const referenceComparer = (a, b) => {
	const partsA = a.split(/(\d+)/);
	const partsB = b.split(/(\d+)/);
	const len = Math.min(partsA.length, partsB.length);
	for (let i = 0; i < len; i++) {
		const pA = partsA[i];
		const pB = partsB[i];
		if (i % 2 === 0) {
			if (pA.length > pB.length) {
				if (pA.slice(0, pB.length) > pB) return 1;
				return -1;
			} else if (pB.length > pA.length) {
				if (pB.slice(0, pA.length) > pA) return -1;
				return 1;
			}
			if (pA < pB) return -1;
			if (pA > pB) return 1;
		} else {
			const nA = Number(pA);
			const nB = Number(pB);
			if (nA < nB) return -1;
			if (nA > nB) return 1;
		}
	}
	if (partsB.length < partsA.length) return 1;
	if (partsB.length > partsA.length) return -1;
	return 0;
};

describe(compareStringsNumeric.name, () => {
	const testCases = [
		["", "a", 1],
		["a", "", -1],
		["", "0", -1],
		["1", "", 1],
		["", "", 0],
		["a", "1", -1],
		["1", "a", 1],
		["_", "1", -1],
		["1", "_", 1],
		["a", "b", -1],
		["b", "a", 1],
		["a", "a", 0],
		["a1", "a2", -1],
		["a2", "a1", 1],
		["a1", "a1", 0],
		["ab1", "ab2", -1],
		["ab2", "ab1", 1],
		["ab1", "a1", -1],
		["a1", "ab1", 1],
		["a1", "a10", -1],
		["a10", "a1", 1],
		["a1", "a01", 0],
		["a1", "a1a", 1],
		["a1a", "a1", -1],
		["a1a", "a01a", 0],
		["a1a", "a1b", -1],
		["a1b", "a1a", 1],
		["a1a", "a1a1", -1],
		["a1a1", "a1a", 1],
		["a1a1", "a1a1", 0],
		["a1a1", "a1a2", -1],
		["a1a2", "a1a1", 1],
		["a1a1", "a1a01", 0],
		["a1a1", "a1a1a", 1],
		["a1a1a", "a1a1", -1],
		["a1a1a", "a1a1a", 0],
		["a1a1a", "a1a1b", -1],
		["a1a1b", "a1a1a", 1],
		["a1a1a", "a1a1a1", -1],
		["a1a1a1", "a1a1a", 1],
		["a1a1a1", "a1a1a1", 0],
		["a1a1a1", "a1a1a2", -1],
		["a1a1a2", "a1a1a1", 1],
		["a1a1a1", "a1a1a01", 0],
		["a1a1a1", "a1a1a1a", 1]
	];

	for (const testCase of testCases) {
		const [a, b, expected] = testCase;
		it(`returns ${expected} when comparing "${a}" to "${b}"`, () => {
			expect(referenceComparer(a, b)).toBe(expected);
			expect(compareStringsNumeric(a, b)).toBe(expected);
		});
	}
});
