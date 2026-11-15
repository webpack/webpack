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
