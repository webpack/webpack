// An object's method returning a value after expressions prints as an arrow.
var b = 5;
var o = {
	plus(a) {
		return a + b;
	},
	[["k"]](v) {
		return [v, b];
	},
	async later(v) {
		return await v;
	},
	shaped() {
		return { b: b };
	},
	logged(v) {
		console.log(v);
		return v;
	}
};
console.log(o.plus(1), o.k(2).join(), o.shaped().b, o.logged(4), Object.keys(o).join());
console.log(o.plus.name, o.plus.length, typeof o.plus.prototype);
o.later(3).then(function (v) {
	console.log(v);
});
// Its own `this`, `arguments`, `super`, a directive or a `__proto__` key
// keeps a method.
var p = {
	self() {
		return this === p;
	},
	count() {
		return arguments.length;
	},
	text() {
		return typeof super.toString;
	},
	__proto__() {
		return 1;
	},
	strict() {
		"use strict";
		return typeof this;
	},
	nested() {
		return function () {
			return this;
		};
	}
};
console.log(p.self(), p.count(1, 2), p.text(), p.strict(), Object.keys(p).join());
try {
	new o.plus();
} catch (error) {
	console.log(error.name);
}
