it("should await provided dependencies without arrow functions", () =>
	import("./consumer.js").then(({ result }) => {
		expect(result).toEqual([true, 42, 42, 42, 42, 42]);
	}));

it("should preserve CommonJS exports without arrow functions", () =>
	import("./consumer.cjs").then(({ default: result }) => {
		expect(result).toEqual({ value: 42, constant: 42, original: true });
	}));
