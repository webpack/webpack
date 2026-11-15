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

it("should keep unary plus on a BigInt as a runtime error", () => {
	expect(() => +1n).toThrow(TypeError);
	expect(() => +(1n + 2n)).toThrow(TypeError);
	expect(() => +(1n % 0n)).toThrow(RangeError);
	expect(() => {
		+1n;
	}).toThrow(TypeError);
});

it("should keep an unused initializer that applies unary plus to a BigInt", () => {
	expect(() => {
		const unused = (() => +1n)();
	}).toThrow(TypeError);
});

it("should still evaluate valid unary operations", () => {
	expect(+"42").toBe(42);
	expect(+42).toBe(42);
	expect(-1n).toBe(BigInt(-1));
	expect(~1n).toBe(BigInt(-2));
});
