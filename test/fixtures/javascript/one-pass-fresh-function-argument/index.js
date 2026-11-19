var log = [];
function show(x) {
	log.push(x);
	return x;
}
function run() {
	(function (f) {
		f();
	})(function () {
		show("called");
	});
	(function (f) {
		show(f(2));
	})(function (n) {
		return n + 1;
	});
	(function (f) {
		for (var i = 0; i < 2; i++) show(f());
	})(function () {
		return "loop";
	});
	(function (f) {
		show(f(), f());
	})(function () {
		return "twice";
	});
	(function (f) {
		"use strict";
		show(f());
	})(function () {
		return typeof this;
	});
	(function (f) {
		var o = {};
		o[f()] = 42;
		show(o.foo);
	})(function () {
		show("foo");
		return "foo";
	});
}
run();
run();
function opaque() {
	return "W";
}
function shadowed(shadow) {
	return (function (f, shadow) {
		return f() + shadow;
	})(function () {
		return eval("shadow");
	}, opaque());
}
show(shadowed("R"));
console.log(log.join());
