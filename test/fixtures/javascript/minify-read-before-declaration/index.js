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

function late() {
	const read = [];
	function first() {
		return limit;
	}
	try {
		read.push(first());
	} catch (err) {
		read.push(err.name);
	}
	const limit = 3;
	read.push(first(), limit * 2);
	return read;
}

function named() {
	const read = [];
	try {
		read.push(label.length);
	} catch (err) {
		read.push(err.name);
	}
	let label = "four";
	read.push(label.length);
	return read;
}

it("should fold a `let` or `const` read after its declaration, keeping a read that may throw before it", () => {
	expect(late()).toEqual(["ReferenceError", 3, 6]);
	expect(named()).toEqual(["ReferenceError", 4]);
});

function hoisted() {
	const read = [];
	try {
		read.push(get());
	} catch (err) {
		read.push(err.name);
	}
	let value = 5;
	function get() {
		return value;
	}
	read.push(get());
	return read;
}

it("should keep a read a function declared after a `let` may make before it is set", () => {
	expect(hoisted()).toEqual(["ReferenceError", 5]);
});
