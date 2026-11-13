it("should minimize apply calls with unused array holes", () => {
	expect(
		(function () {
			return 1;
		}).apply(null, [, 1])
	).toBe(1);
});

it("should preserve argument positions, length and receiver with array holes", () => {
	const receiver = { marker: 42 };
	(function () {
		expect(this).toBe(receiver);
		expect(arguments.length).toBe(4);
		expect(Array.prototype.slice.call(arguments)).toEqual([
			undefined,
			2,
			undefined,
			undefined
		]);
	}).apply(receiver, [, 2, , ,]);
});

it("should minimize apply calls without array holes", () => {
	(function () {
		expect(arguments.length).toBe(2);
		expect(Array.prototype.slice.call(arguments)).toEqual([1, 2]);
	}).apply(null, [1, 2]);
	(function () {
		expect(arguments.length).toBe(0);
	}).apply(null, []);
});
