const LazySet = require("../lib/util/LazySet");

describe("LazySet", () => {
	it("addAll", () => {
		const a = new Set(["a"]);
		const sut = new LazySet(a);
		const empty = new LazySet([]);
		expect(sut.size).toBe(1);
		sut.addAll(empty);
		expect(sut._toDeepMerge).toStrictEqual([]);
		expect(sut.size).toBe(1);
		const b = new Set(["b"]);
		sut.addAll(b);
		expect(sut._toMerge).toContain(b);
		expect(sut.size).toBe(2);
		const c = new LazySet(["c"]);
		sut.addAll(c);
		expect(sut._toDeepMerge).toContain(c);
		expect(sut.size).toBe(3);
		expect(sut._toDeepMerge).toStrictEqual([]);
	});
});
