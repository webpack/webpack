// An object read at one key but for constants holds that value in its name.
function run(C, n) {
	return new C(n).value;
}
var shapes = {
	Box: class Foo {
		constructor(n) {
			this.value = n * 10;
		}
	},
	x: 1,
	y: 2
};
console.log(shapes.Box === shapes.Box, run(shapes.Box, shapes.x), new shapes.Box(shapes.y).value);
var log = {
	f: function show(x) {
		return "got " + typeof x;
	},
	a: 1
};
console.log(log.f(log.f), log.f(log.a));
var pattern = { r: /a/g, text: "aa" };
console.log(pattern.r.test(pattern.text), pattern.r.lastIndex, pattern.r.source);
function inner() {
	var o = {
		p: function add(n) {
			return n + 1;
		},
		k: 3
	};
	return o.p(o.k) + o.p.length;
}
console.log(inner());
// Kept: two keys read, `this` passed, or a name the key gives.
var two = {
	f: function one() {
		return 1;
	},
	g: function two() {
		return 2;
	}
};
console.log(two.f() + two.g());
var self = {
	f: function same() {
		return this === self;
	},
	a: 1
};
console.log(self.f(), self.a);
function anonymous() {
	var o = { f: function () {}, g: () => {}, a: 1 };
	return o.f.name + o.a;
}
console.log(anonymous());
function twice() {
	var o = {
		f: function first() {
			return 1;
		},
		f: function second() {
			return 2;
		},
		x: 3
	};
	return [typeof o.f, o.x].join();
}
console.log(twice());
function mixed() {
	var o = {
		f: function called() {
			return 6;
		},
		g: function read() {
			return 7;
		},
		x: 8
	};
	return [o.f(), typeof o.g, o.x].join();
}
console.log(mixed());
