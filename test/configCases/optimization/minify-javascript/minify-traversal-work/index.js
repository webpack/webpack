it("should preserve captured values beside nested functions with their own variables", () => {
	/**
	 * @param {() => { value: number }} make creates the captured object
	 * @returns {(() => number)[]} readers from separate scopes
	 */
	function capture(make) {
		/** @returns {number} a value from a nested scope */
		function nested() {
			var source = make();
			for (var index = 0; index < source.value; index++) {
				var copy = index;
			}
			return copy;
		}
		const arrow = () => {
			var source = make();
			return source.value;
		};
		var source = make();
		/** @returns {number} the captured value read twice */
		function read() {
			var copy = source;
			return copy.value + copy.value;
		}
		return [read, nested, arrow];
	}
	let calls = 0;
	const readers = capture(() => ({ value: ++calls }));
	expect(readers.map((read) => read())).toEqual([2, 1, 3]);
	expect(readers[0]()).toBe(2);
	expect(calls).toBe(3);
	expect(capture.toString()).toMatchSnapshot();
});

it("should preserve copies of variables initialized inside a loop", () => {
	/**
	 * @param {{ value: number }[]} values objects captured on successive iterations
	 * @returns {(() => number)[]} readers holding separate copies
	 */
	function capture(values) {
		const readers = [];
		for (var index = 0; index < values.length; index++) {
			var source = values[index];
			(function () {
				var copy = source;
				readers.push(() => copy.value + copy.value);
			})();
		}
		return readers;
	}
	expect(capture([{ value: 2 }, { value: 3 }]).map((read) => read())).toEqual([
		4, 6
	]);
	expect(capture.toString()).toMatchSnapshot();
});

it("should preserve copies when a generator resumes inside a loop", () => {
	/**
	 * @param {{ value: number }[]} values objects captured across suspensions
	 * @returns {Generator<() => number, void, unknown>} readers from each iteration
	 */
	function* capture(values) {
		for (var source of values) {
			yield (function () {
				var copy = source;
				return () => copy.value + copy.value;
			})();
		}
	}
	const readers = Array.from(capture([{ value: 2 }, { value: 3 }]));
	expect(readers.map((read) => read())).toEqual([4, 6]);
	expect(capture.toString()).toMatchSnapshot();
});

it("should preserve assignments when joining bare declarations across blocks", () => {
	/**
	 * @param {boolean} flag selects the conditional declaration
	 * @param {number[]} calls records assignment order
	 * @returns {(number | undefined)[]} values from the outer and inner scopes
	 */
	function joined(flag, calls) {
		var value;
		if (flag) {
			var extra;
			extra = calls.push(1);
		}
		value = calls.push(2);
		/** @returns {number} the independently assigned inner value */
		function inner() {
			var value;
			value = calls.push(3);
			return value;
		}
		var result = inner();
		value = calls.push(4);
		return [value, extra, result];
	}
	const calls = [];
	expect(joined(true, calls)).toEqual([4, 1, 3]);
	expect(calls).toEqual([1, 2, 3, 4]);
	calls.length = 0;
	expect(joined(false, calls)).toEqual([3, undefined, 2]);
	expect(calls).toEqual([2, 3, 4]);
	expect(joined.toString()).toMatchSnapshot();
});

it("should keep repeated member reads before a later write", () => {
	/**
	 * @param {{ value: number }} object the object read and written
	 * @returns {number} the value before the final write
	 */
	function read(object) {
		var result = object.value + object.value + (object.value = 5) + object.value;
		object.value = 9;
		return result;
	}
	const object = { value: 2 };
	expect(read(object)).toBe(14);
	expect(object.value).toBe(9);
	expect(read.toString()).toMatchSnapshot();
});

it("should preserve getters and shadowed parameters during assignment folding", () => {
	/**
	 * @param {{ value: number }} object the outer object
	 * @param {{ value: number }} other the inner object
	 * @returns {number} reads from both scopes
	 */
	function read(object, other) {
		var result = object.value + (function (object) {
			var value = object.value + object.value;
			object.value = 7;
			return value + object.value;
		})(other) + object.value;
		return result;
	}
	let reads = 0;
	const outer = { get value() { return ++reads; } };
	const inner = { value: 3 };
	expect(read(outer, inner)).toBe(16);
	expect(reads).toBe(2);
	expect(inner.value).toBe(7);
	expect(read.toString()).toMatchSnapshot();
});
