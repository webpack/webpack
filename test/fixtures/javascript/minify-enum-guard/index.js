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

function enums() {
	var Color = (function (Color) {
		Color[(Color.Red = 0)] = "Red";
		return Color;
	})(Color || {});
	var Shape;
	(function (Shape) {
		Shape[(Shape.Square = 1)] = "Square";
	})(Shape || (Shape = {}));
	return [Color, Shape];
}

var calls = 0;

function boxed() {
	var Box = (Box || { size: 1 }).size;
	var unread = (unread || {
		run: function () {
			calls++;
		}
	}).run();
	return Box;
}

function cached(list) {
	var cache;
	for (var i = 0; i < list.length; i++) {
		(function (cache) {
			cache.push(list[i]);
		})(cache || (cache = []));
	}
	return cache;
}

function shared() {
	var store;
	var seen = [];
	function add() {
		seen.push(store || (store = { count: 0 }));
	}
	add();
	add();
	return seen[0] === seen[1];
}

function written() {
	var flag;
	flag = 1;
	(function (flag) {
		return flag;
	})(flag || (flag = {}));
	return flag;
}

function early() {
	function set() {
		Early = 1;
		Early = 2;
	}
	var Early = (function (_, Early) {
		return Early;
	})(set(), Early || {});
	return Early;
}

function preset(value) {
	var held = value;
	(function (held) {
		held.seen = true;
	})(held || (held = {}));
	return held;
}

it("should fold a `var` guarded before anything writes it, as TypeScript writes an enum", () => {
	const [color, shape] = enums();
	expect(color).toEqual({ 0: "Red", Red: 0 });
	expect(shape).toEqual({ 1: "Square", Square: 1 });
	expect(boxed()).toBe(1);
	expect(calls).toBe(1);
});

it("should keep a guard that may run after a write", () => {
	expect(cached([1, 2])).toEqual([1, 2]);
	expect(shared()).toBe(true);
	expect(written()).toBe(1);
	expect(early()).toBe(2);
	const value = {};
	expect(preset(value)).toBe(value);
	expect(value.seen).toBe(true);
});
