const numberHash = require("../lib/util/numberHash");
const { numberToIdentifier } = require("../lib/Template");

describe("numberHash", () => {
	for (const n of [10, 100, 1000, 10000]) {
		it("should eventually fill nearly the complete range up to n", () => {
			const set = new Set();
			for (let i = 0; i < n * 200; i++) {
				set.add(numberHash(numberToIdentifier(i), n));
				if (set.size >= n - 1) break;
			}
			expect(set.size).toBeGreaterThanOrEqual(n - 1);
		});
	}
});
