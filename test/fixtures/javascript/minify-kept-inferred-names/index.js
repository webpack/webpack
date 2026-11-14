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

it("should keep inferred function names when an enclosing variable has the same name", () => {
	var preserved = function () {
		return "outer";
	};
	(function () {
		var preserved = function () {
			return "inner";
		};
		expect(preserved()).toBe("inner");
		expect(preserved.name).toBe("preserved");
	})();
	expect(preserved()).toBe("outer");
	expect(preserved.name).toBe("preserved");
});

it("should keep inferred arrow function names when an enclosing variable has the same name", () => {
	var preserved = () => "outer";
	(function () {
		var preserved = () => "inner";
		expect(preserved()).toBe("inner");
		expect(preserved.name).toBe("preserved");
	})();
	expect(preserved()).toBe("outer");
	expect(preserved.name).toBe("preserved");
});

it("should keep inferred class names when an enclosing variable has the same name", () => {
	var preservedClass = class {};
	(function () {
		var preservedClass = class {};
		expect(new preservedClass()).toBeInstanceOf(preservedClass);
		expect(preservedClass.name).toBe("preservedClass");
	})();
	expect(new preservedClass()).toBeInstanceOf(preservedClass);
	expect(preservedClass.name).toBe("preservedClass");
});
