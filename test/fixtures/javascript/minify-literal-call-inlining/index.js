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

function rows(count) {
	function label(n) {
		let text = "row";
		if (n > 1) text += "s";
		return text;
	}
	function total(n) {
		let sum = 0;
		for (let i = 1; i <= n; i++) sum += i;
		return sum;
	}
	return () => [count, label(count), { total: total(count) }];
}

function listed() {
	function item() {
		return "item";
	}
	return () => [item, { item }];
}

it("should inline a function called once inside an array or object literal", () => {
	expect(rows(3)()).toEqual([3, "rows", { total: 6 }]);
	expect(rows(1)()).toEqual([1, "row", { total: 1 }]);
});

it("should keep a function an array or object literal holds", () => {
	const [first, { item }] = listed()();
	expect(first).toBe(item);
	expect(first()).toBe("item");
});
