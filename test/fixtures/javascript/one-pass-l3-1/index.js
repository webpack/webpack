// An `if` calling a function of the body runs it before the `var` is set.
function early() {
	if (read()) console.log("set");
	else console.log("unset");
	var value = 1;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(early()[1]());
// A call of a global reaches no function of the body.
function builtIn() {
	console.log("built-in");
	var value = 2;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(builtIn()[1]());
// Each of these hands a function of the body to the call after it.
function handed(run) {
	var held = function () {
		return read();
	};
	run(held);
	var value = 3;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(handed(function (f) {
	console.log(f());
})[1]());
function arrow(run) {
	run(() => read());
	var value = 4;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(arrow(function (f) {
	console.log(f());
})[1]());
function named(run) {
	var first = run(read);
	var value = 5;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(named(function (f) {
	console.log(f());
})[1]());
function classes(run) {
	class Reader {
		get() {
			return read();
		}
	}
	run(new Reader());
	var value = 6;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(classes(function (r) {
	console.log(r.get());
})[1]());
function expressed(run) {
	run(
		new (class {
			get() {
				return read();
			}
		})()
	);
	var value = 7;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(expressed(function (r) {
	console.log(r.get());
})[1]());
// A parameter hands over nothing of the body; `eval` may read any name.
function passed(run) {
	run(run);
	var value = 8;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(passed(function () {})[1]());
function evaluated(run) {
	run(eval);
	var value = 9;
	function read() {
		return value;
	}
	return [read, read];
}
console.log(evaluated(function () {})[1]());
// A long string read after calls keeps its name.
function kept(target) {
	var size = target.size(1),
		key = "orientationchange";
	function fire() {
		target.trigger(key);
	}
	target.bind("resize", fire);
	target.bind("scroll", fire);
	target.on[key] = function (handler) {
		return handler ? target.bind(key, handler) : target.trigger(key);
	};
	if (target.flags) target.flags[key] = size;
}
var target = {
	size: function (n) {
		return n;
	},
	trigger: function (name) {
		console.log("trigger", name);
	},
	bind: function (name, f) {
		console.log("bind", name);
		if (typeof f === "function") f();
	},
	on: {},
	flags: {}
};
kept(target);
console.log(Object.keys(target.on).join(), target.flags.orientationchange);
