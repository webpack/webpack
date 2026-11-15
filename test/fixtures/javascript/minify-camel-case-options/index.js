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

it("should keep function and class names, as `keepFnames` and `keepClassnames` ask", () => {
	function namedFunction() {
		return 1;
	}
	class NamedClass {}
	expect(namedFunction()).toBe(1);
	expect(namedFunction.name).toBe("namedFunction");
	expect(NamedClass.name).toBe("NamedClass");
});

it("should write only ASCII, as `asciiOnly` asks", () => {
	const text = () => "café";
	expect(text()).toHaveLength(4);
	// A function's text is the code the minifier wrote for it.
	expect(text.toString()).not.toMatch(/[^\x00-\x7f]/);
});
