it("should propagate async provided dependencies through reexports", () =>
	import("./reexport.js").then(({ result }) => {
		expect(result).toEqual([true, 42, 42, 42, 42, 42]);
	}));

it("should await provided dependencies alongside ordinary imports", () =>
	import("./mixed.js").then(({ result }) => {
		expect(result).toEqual([42, 42, 42]);
	}));

it("should await provided promise externals", () =>
	import("./external.js").then(({ result }) => {
		expect(result).toEqual([43, 43]);
	}));

it("should reject when a provided dependency fails", () =>
	expect(import("./rejected.js")).rejects.toThrow("provided failure"));

it("should await provided dependencies before using inlined exports", () =>
	import("./inlined-consumer.js").then(({ result }) => {
		expect(result).toEqual([44, true]);
	}));
