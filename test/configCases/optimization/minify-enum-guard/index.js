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
