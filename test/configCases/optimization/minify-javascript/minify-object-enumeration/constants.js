it("should enumerate array literals without reading holes or length", () => {
	/** @returns {Array<Array<string | number | [string, number]>>} enumerated properties */
	function enumerate() {
		return [
			Object.keys([10, , 30]),
			Object.values([10, , 30]),
			Object.entries([10, , 30]),
			Object.keys([]),
			Object.values([, ,]),
			Object.entries([])
		];
	}
	expect(enumerate()).toEqual([
		["0", "2"],
		[10, 30],
		[["0", 10], ["2", 30]],
		[],
		[],
		[]
	]);
	expect(enumerate.toString()).toMatchSnapshot();
});

it("should enumerate a string's UTF-16 code units", () => {
	/** @returns {Array<Array<string | [string, string]>>} enumerated properties */
	function enumerate() {
		return [
			Object.keys("\ud83d\ude00"),
			Object.values("ab"),
			Object.entries("a"),
			Object.values("\ud800"),
			Object.keys(""),
			Object.values(""),
			Object.entries("")
		];
	}
	expect(enumerate()).toEqual([
		["0", "1"],
		["a", "b"],
		[["0", "a"]],
		["\ud800"],
		[],
		[],
		[]
	]);
	expect(enumerate.toString()).toMatchSnapshot();
	expect(Object.values("\ud83d\ude00")).toEqual(["\ud83d", "\ude00"]);
	expect(Object.entries("ab")).toEqual([["0", "a"], ["1", "b"]]);
});

it("should preserve array element values and anonymous function names", () => {
	const reference = {};
	/**
	 * @template T
	 * @param {T} value the first element
	 * @returns {Array<T | (() => void) | (new () => object) | undefined>} the values
	 */
	function values(value) {
		return Object.values([value, function () {}, class {}, undefined]);
	}
	const result = values(reference);
	expect(result[0]).toBe(reference);
	expect(result[1].name).toBe("");
	expect(result[2].name).toBe("");
	expect(result[3]).toBeUndefined();
});
