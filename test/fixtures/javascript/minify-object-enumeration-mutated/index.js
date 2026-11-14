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

it("should preserve replaced Object enumeration methods", () => {
	const keys = Object.keys;
	const values = Object.values;
	const entries = Object.entries;
	try {
		Object.keys = () => ["keys"];
		Object.values = () => ["values"];
		Object.entries = () => ["entries"];
		const result = [
			Object.keys([1]), Object.keys("a"),
			Object.values([1]), Object.values("a"),
			Object.entries([1]), Object.entries("a")
		];
		Object.keys = keys;
		Object.values = values;
		Object.entries = entries;
		expect(result).toEqual([
			["keys"], ["keys"], ["values"], ["values"], ["entries"], ["entries"]
		]);
	} finally {
		Object.keys = keys;
		Object.values = values;
		Object.entries = entries;
	}
});
