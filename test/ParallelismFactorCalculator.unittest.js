"use strict";

const ParallelismFactorCalculator = require("../lib/util/ParallelismFactorCalculator");

describe("ParallelismFactorCalculator", () => {
	it("should report a factor of 1 for an empty range immediately", () => {
		const calculator = new ParallelismFactorCalculator();
		const factor = jest.fn();
		calculator.range(3, 3, factor);
		// an empty range resolves without waiting for calculate()
		expect(factor).toHaveBeenCalledWith(1);
	});

	it("should compute the time-weighted parallelism of overlapping ranges", () => {
		const calculator = new ParallelismFactorCalculator();
		/** @type {Record<string, number>} */
		const results = {};
		calculator.range(0, 10, (v) => {
			results.a = v;
		});
		calculator.range(0, 10, (v) => {
			results.b = v;
		});
		calculator.range(5, 10, (v) => {
			results.c = v;
		});
		calculator.calculate();
		// [0,5] has 2 concurrent ranges, [5,10] has 3 -> a,b average (2*5+3*5)/10
		expect(results.a).toBe(2.5);
		expect(results.b).toBe(2.5);
		// c only spans the fully-overlapped [5,10] window
		expect(results.c).toBe(3);
	});

	it("should report a factor of 1 for a single non-overlapping range", () => {
		const calculator = new ParallelismFactorCalculator();
		let result;
		calculator.range(0, 4, (v) => {
			result = v;
		});
		calculator.calculate();
		expect(result).toBe(1);
	});
});
