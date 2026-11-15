// The config case's `it` and `expect`, logging what each assertion reads,
// so a print that changes a value or a throw runs otherwise.
var show = function (value) {
	if (typeof value === "function") return "[function]";
	try {
		return String(JSON.stringify(value, function (key, one) {
			return typeof one === "bigint" ? one + "n" : typeof one === "function" ? "[function]" : one;
		}));
	} catch (error) {
		return String(value);
	}
};
var it = function (title, body) {
	console.log("it", title);
	try {
		body(function () {});
	} catch (error) {
		console.log("throws", error && error.name);
	}
};
var expect = function (value) {
	var matchers = new Proxy({}, {
		get: function (target, name) {
			if (name === "not" || name === "resolves" || name === "rejects") return matchers;
			return function () {
				if (/Snapshot$/.test(name)) return;
				if (/^toThrow/.test(name) && typeof value === "function") {
					try {
						console.log(name, "returns", show(value()));
					} catch (error) {
						console.log(name, "throws", error && error.name);
					}
					return;
				}
				console.log(name, show(value));
			};
		}
	});
	return matchers;
};

it("should preserve array element effects and exceptions", () => {
	const calls = [];
	/**
	 * @param {number} value the next value
	 * @returns {number} the recorded value
	 */
	function record(value) {
		calls.push(value);
		return value;
	}
	expect(Object.keys([record(1), , record(2)])).toEqual(["0", "2"]);
	expect(Object.values([record(3), record(4)])).toEqual([3, 4]);
	expect(Object.entries([record(5)])).toEqual([["0", 5]]);
	expect(calls).toEqual([1, 2, 3, 4, 5]);
	expect(() => Object.keys([missingEnumerationValue])).toThrow(ReferenceError);
});

it("should preserve array element reads before a let declaration", () => {
	expect(() => Object.keys([value])).toThrow(ReferenceError);
	let value;
});

it("should preserve array element reads before a const declaration", () => {
	expect(() => Object.keys([value])).toThrow(ReferenceError);
	const value = 1;
});

it("should preserve typeof before a lexical declaration", () => {
	expect(() => Object.keys([typeof value])).toThrow(ReferenceError);
	let value;
});

it("should preserve reads of a loop binding in its own iterable", () => {
	expect(() => {
		for (let value of Object.keys([value])) expect(value).toBeDefined();
	}).toThrow(ReferenceError);
});

it("should preserve iteration when enumerating an array with a spread", () => {
	let iterations = 0;
	const iterable = {
		*[Symbol.iterator]() {
			iterations++;
			yield 4;
			yield 5;
		}
	};
	expect(Object.keys([...iterable])).toEqual(["0", "1"]);
	expect(Object.values([...iterable])).toEqual([4, 5]);
	expect(Object.entries([...iterable])).toEqual([["0", 4], ["1", 5]]);
	expect(iterations).toBe(3);
});

it("should keep shadowed Object methods and unsupported inputs", () => {
	/**
	 * @param {{keys: (value: number[]) => number, values: (value: string) => number, entries: (value: never[]) => number}} Object the shadowed methods
	 * @returns {number[]} their results
	 */
	function shadow(Object) {
		return [Object.keys([1]), Object.values("a"), Object.entries([])];
	}
	expect(shadow({ keys: () => 1, values: () => 2, entries: () => 3 })).toEqual([
		1, 2, 3
	]);
	expect(() => Object.keys(null)).toThrow(TypeError);
	expect(() => Object.values(undefined)).toThrow(TypeError);
	expect(Object.entries(1)).toEqual([]);
});
