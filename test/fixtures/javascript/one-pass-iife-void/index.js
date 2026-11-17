// A function called in place returning nothing reads as `void` of what it runs.
var log = [];
var first = (function () {
	log.push("first");
})();
console.log(first, log.join());
var second = (() => {
	log.push("a");
	log.push("b");
})();
console.log(second, log.join());
var called = (function () {
	return function () {
		log.push("called");
	};
})()();
console.log(called, log.join());
try {
	(function () {
		log.push("callee");
	})()();
} catch (error) {
	console.log(error instanceof TypeError, log.join());
}
console.log(
	typeof (function () {
		log.push("typeof");
	})(),
	(function () {
		log.length = 1;
	})() ** 1
);
// An unread parameter defaulting to a literal goes with the call.
function pass(value) {
	return (function (a, b = 1) {
		return a;
	})(value, 7);
}
function skip(value) {
	return (function (a = 1, b) {
		return b;
	})(void 0, value);
}
console.log(pass("pass"), skip("skip"));
// `this`, `arguments`, a name or a default that runs keep the call.
var holder = {
	value: "this",
	read() {
		return function () {
			log.push(this === holder);
		}.call(this);
	},
	arrow() {
		return (() => {
			log.push(this.value);
		})();
	}
};
console.log(holder.read(), holder.arrow(), log.join());
function args() {
	return (() => {
		log.push(arguments.length);
	})();
}
console.log(args(1, 2), log.join());
var named = (function self() {
	log.push(typeof self);
})();
console.log(named, log.join());
function effect(value) {
	return (function (a, b = log.push("default")) {
		return a;
	})(value);
}
function read(value) {
	return (function (a, b = 1) {
		return a + b;
	})(value);
}
console.log(effect(1), read(1), log.join());
// Read nowhere, or running nothing, it prints bare or as `void 0`.
var sequence = ((function () {
	log.push("sequence");
})(), log.length);
console.log(sequence, log.join());
function unreadDeclarator() {
	var unread = (function () {
		log.push("declarator");
	})();
	return log.join();
}
function unreadAssignment() {
	var unread;
	return (
		(unread = (function () {
			log.push("assignment");
		})()),
		log.join()
	);
}
console.log(unreadDeclarator(), unreadAssignment());
var nothing = (function () {
	0;
})();
var bracket = (function () {
	[log].pop().push("bracket");
})();
console.log(nothing, bracket, log.join());
// A pattern defaulting to a literal keeps the call.
function pattern(value) {
	return (function (a, { b } = 1) {
		return a;
	})(value);
}
console.log(pattern("pattern"));
