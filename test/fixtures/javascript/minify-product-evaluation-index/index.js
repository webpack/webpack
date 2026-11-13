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

const {
	multiply,
	divide,
	remainder,
	throughAlias,
	throughCall,
	throughClosure
} = require("./math");

it("should read a multiplication's left operand before writing arguments", () => {
	expect(multiply(2)).toBe(12);
	expect(divide(2)).toBe(6);
	expect(remainder(2)).toBe(4);
});

it("should preserve parameter reads when arguments escapes", () => {
	expect(throughAlias(2)).toBe(12);
	expect(throughCall(2, values => (values[0] = 3))).toBe(12);
	expect(throughClosure(2)).toBe(12);
});
