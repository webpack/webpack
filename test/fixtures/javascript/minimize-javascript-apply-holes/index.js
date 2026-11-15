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
