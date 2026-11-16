// A `var` naming a catch parameter sets the parameter, which nothing reads.
var shadowed = "PASS";
try {
	throw "FAIL1";
} catch (shadowed) {
	var shadowed = "FAIL2";
}
console.log(shadowed);
console.log(
	(function (log) {
		var kept = 1;
		try {
			throw 0;
		} catch (kept) {
			var kept = log.push("set");
		}
		return [kept, log];
	})([])
);
console.log(
	(function () {
		count++;
		try {
			throw 0;
		} catch (count) {
			var count;
		}
		return "dropped";
	})()
);
// Read in the clause, or declared only there and read after, it stays.
console.log(
	(function () {
		try {
			throw 0;
		} catch (read) {
			var read = "inner";
			return read;
		}
	})()
);
console.log(
	(function () {
		try {
			throw 0;
		} catch (after) {
			var after = "inner";
		}
		return after;
	})()
);
// A `var` of a parameter declares nothing new.
console.log(
	(function (value) {
		var value;
		return value;
	})("param")
);
// An arrow, or a function with a default, does not map `arguments`.
console.log(
	(function (outer) {
		return ((value) => [(value = "foo"), arguments[0]])("bar");
	})("outer")
);
console.log(
	(function (value = "baz") {
		return [(value = "foo"), arguments[0]];
	})("bar")
);
console.log(
	(function (value) {
		return [(value = "foo"), arguments[0]];
	})("bar")
);
// Setting a property of a fresh literal runs only its value.
function* generate() {
	var target = {};
	target.prop = yield 5;
}
console.log(generate().next().value);
console.log(
	(function () {
		var log = [];
		var handler = function () {
			return log;
		};
		handler.displayName = log.push("value");
		({ x: 0 }).x = log.push("own");
		({})[1] = 2;
		(() => 0).tag = log.push("arrow");
		return log.join();
	})()
);
// An accessor, a prototype, a read-only key or a later read keeps the write.
console.log(
	(function () {
		var log = [];
		({
			set x(value) {
				log.push(value);
			}
		}).x = "setter";
		({ __proto__: { set y(value) { log.push(value); } } }).y = "proto";
		var kept = {};
		kept.z = "read";
		log.push(kept.z);
		try {
			(function () {
				"use strict";
				(function () {}).name = "x";
			})();
		} catch (error) {
			log.push(error.name);
		}
		var fn = function () {};
		fn.length = 5;
		log.push(fn.length);
		return log.join();
	})()
);
// A spread may run a getter: the literal and its write stay.
console.log(
	(function () {
		var log = [];
		({ ...log, a: 1 }).b = log.push("spread");
		return log.join();
	})()
);
// A comment on the folded literal keeps the write.
console.log(
	(function () {
		var log = [];
		var fresh = /*! kept */ {};
		fresh.c = log.push("comment");
		return log.join();
	})()
);
