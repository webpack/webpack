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

function joined(x) {
	return "a" + ("b" + x);
}

function converted(x) {
	return [String(x + "s")];
}

function shifted(v) {
	return (v - 0 | 0) >>> 1;
}

function pattern(n) {
	return `${(0, /c/g)}${n}`;
}

it("should join a string literal with the one opening the `+` added to it", () => {
	expect(joined(1)).toBe("ab1");
	expect(joined("x")).toBe("abx");
});

it("should print `String` of a string as that string", () => {
	expect(converted(1)).toEqual(["1s"]);
	expect(converted("q")).toEqual(["qs"]);
});

it("should drop a `|0` an operand of `>>>` takes where it converts no later than before", () => {
	expect(shifted(-1)).toBe(2147483647);
	expect(shifted(4.7)).toBe(2);
});

it("should write a regexp a sequence ends with as template text", () => {
	expect(pattern(1)).toBe("/c/g1");
	expect(pattern(2)).toBe("/c/g2");
});
