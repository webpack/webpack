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

// These functions must stay non-strict so parameters alias `arguments`.
it("should preserve a parameter alias while copying arguments into a sized array", () => {
	const copy = (function (values) {
		for (
			var length = arguments.length, values = Array(length), index = 0;
			index < length;
			index++
		) {
			values[index] = arguments[index];
		}
		return values;
	})(1, 2);
	expect(copy[0]).toBe(copy);
	expect(copy[1]).toBe(2);
});

it("should preserve a parameter alias while copying arguments into an empty array", () => {
	const copy = (function (values) {
		for (var values = [], index = 0; index < arguments.length; index++) {
			values[index] = arguments[index];
		}
		return values;
	})(1, 2);
	expect(copy[0]).toBe(copy);
	expect(copy[1]).toBe(2);
});
