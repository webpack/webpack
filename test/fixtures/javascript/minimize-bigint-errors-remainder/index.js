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

/**
 * @param {string} body a function body
 * @returns {Function | undefined} the class of what it throws, read unminified
 */
const thrownBy = (body) => {
	try {
		new Function(body)();
	} catch (error) {
		return /** @type {Error} */ (error).constructor;
	}
};

it("should keep a BigInt remainder by zero as a runtime error", () => {
	expect(() => 1n % 0n).toThrow(RangeError);
	expect(() => 1n % (2n - 2n)).toThrow(RangeError);
	// Bun's engine skips a unary `+` feeding `%`, throwing the RangeError where the
	// spec throws a TypeError, so the minified form is held to the engine's own read.
	expect(() => +1n % 0n).toThrow(thrownBy("return +1n % 0n"));
	expect(() => 1 % 0n).toThrow(TypeError);
	expect(() => 1n % 0).toThrow(TypeError);
	expect(() => {
		1n % 0n;
	}).toThrow(RangeError);
});

it("should keep an unused initializer with a BigInt remainder by zero", () => {
	expect(() => {
		const unused = (() => 1n % 0n)();
	}).toThrow(RangeError);
});

it("should still evaluate valid remainders", () => {
	expect(5n % 2n).toBe(BigInt(1));
	expect(-5n % 2n).toBe(BigInt(-1));
	expect(5 % 2).toBe(1);
	expect(1 % 0).toBeNaN();
});
