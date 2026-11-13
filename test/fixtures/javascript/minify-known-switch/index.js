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

var KIND = "square";

function matched(log) {
	switch (KIND) {
		case "circle":
			log.push("circle");
			break;
		case "square":
			log.push("square");
		case "triangle":
			log.push("falls through");
			break;
		default:
			log.push("default");
	}
	return log;
}

function fallback(log) {
	switch (3) {
		default:
			log.push("default");
		case 1:
			log.push("one");
			break;
		case 2:
			log.push("two");
	}
	return log;
}

function scoped() {
	switch (1) {
		case 1:
			let value = Math.random() < 2 ? "block" : "never";
			return value;
		case 2:
			return "two";
	}
}

function shadowed(log, label) {
	switch (1) {
		case 1:
			let label = "inner";
			log.push(label);
	}
	log.push(label);
	return log;
}

function unmatched(log, flag) {
	if (flag) {
		switch (1) {
			case 2:
				log.push("two");
		}
	} else log.push("else");
	return log;
}

function labeled(log) {
	found: switch (1) {
		case 1:
			log.push("one");
			break found;
		default:
			log.push("default");
	}
	return log;
}

function guarded(log, done) {
	if (done) return;
	switch (1) {
		case 1:
			log.push("a");
			log.push("b");
	}
}

function guardedEmpty(log, done) {
	if (done) return;
	switch (1) {
		case 2:
			log.push("two");
	}
}

function unknownFirst(log, at) {
	switch (1) {
		case at():
			log.push("at");
			break;
		case 1:
			log.push("one");
	}
	return log;
}

function nestedBreak(log, flag) {
	switch (1) {
		case 1:
			if (flag) break;
			log.push("after");
			break;
		default:
			log.push("default");
	}
	return log;
}

function hoisted(log) {
	switch (1) {
		case 0:
			var held = "set";
		case 1:
			log.push(typeof held);
	}
	return log;
}

it("should print the statements a `switch` on a known value runs", () => {
	expect(matched([])).toEqual(["square", "falls through"]);
	expect(fallback([])).toEqual(["default", "one"]);
	expect(scoped()).toBe("block");
	expect(shadowed([], "outer")).toEqual(["inner", "outer"]);
	expect(shadowed([], "other")).toEqual(["inner", "other"]);
	expect(labeled([])).toEqual(["one"]);
});

it("should keep a `switch` whose path is not known or whose dropped cases declare", () => {
	var log = [];
	guarded(log, true);
	guarded(log, false);
	guardedEmpty(log, true);
	guardedEmpty(log, false);
	expect(log).toEqual(["a", "b"]);
	expect(unmatched([], true)).toEqual([]);
	expect(unmatched([], false)).toEqual(["else"]);
	expect(unknownFirst([], () => 1)).toEqual(["at"]);
	expect(nestedBreak([], true)).toEqual([]);
	expect(nestedBreak([], false)).toEqual(["after"]);
	expect(hoisted([])).toEqual(["undefined"]);
});
