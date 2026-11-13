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

function nullish() {
	var Size;
	(function (Size) {
		Size.Large = 2;
	})(Size ?? (Size = {}));
	return Size;
}

function fields() {
	var made;
	var Made = class {
		value = made || (made = {});
	};
	return new Made().value === new Made().value;
}

it("should fold a `var` guarded by `??` before anything writes it", () => {
	expect(nullish()).toEqual({ Large: 2 });
});

it("should keep a guard in a field's value, which runs for each instance", () => {
	expect(fields()).toBe(true);
});
