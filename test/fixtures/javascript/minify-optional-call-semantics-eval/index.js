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

it("should preserve direct eval behind a nullish conditional", function () {
	expect(
		(function (eval) {
			var value = 42;
			return eval == null ? undefined : eval("value");
		})(eval)
	).toBe(42);
});

it("should preserve direct eval behind a nullish statement guard", function () {
	expect(
		(function (eval) {
			var value = 42;
			eval != null && eval("value = 43");
			return value;
		})(eval)
	).toBe(43);
});

it("should preserve an existing optional eval call", function () {
	// Older engines treat optional eval calls as direct calls.
	var expected = new Function(
		"eval",
		'var localValue = 42; return eval?.("typeof localValue");'
	)(eval);
	expect(
		(function (eval) {
			var localValue = 42;
			return eval == null ? undefined : eval?.("typeof localValue");
		})(eval)
	).toBe(expected);
});
