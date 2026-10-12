it("should await provided dependencies before deferred evaluation", () =>
	import.defer("./consumer.js").then(({ result }) => {
		expect(result).toEqual([true, 42, 42, 42, 42, 42]);
	}));

it("should propagate async provided dependencies through reexports", () =>
	import("./reexport.js").then(({ result }) => {
		expect(result).toEqual([true, 42, 42, 42, 42, 42]);
	}));

it("should await provided dependencies alongside ordinary imports", () =>
	import("./mixed.js").then(({ result }) => {
		expect(result).toEqual([42, 42, 42]);
	}));

it("should preserve CommonJS exports when awaiting provided dependencies", () =>
	import("./consumer.cjs").then(({ default: result }) => {
		expect(result).toEqual({ value: 42, constant: 42, original: true });
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

it("should await transitively provided CommonJS dependencies", () =>
	import("./transitive.js").then(({ result }) => {
		expect(result).toBe(42);
	}));

it("should reject CommonJS modules when a provided dependency fails", () =>
	expect(import("./rejected.cjs")).rejects.toThrow("provided failure"));

it("should propagate errors through cycles containing provided dependencies", () =>
	expect(import("./cycle-async.js"))
		.rejects.toThrow("provided cycle failure")
		.then(() =>
			expect(import("./cycle.cjs")).rejects.toThrow("provided cycle failure")
		));
