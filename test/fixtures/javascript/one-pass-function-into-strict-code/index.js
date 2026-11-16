// Moved into strict code, a sloppy function would throw where it set a global.
function run() {
	const write = function () {
		__sloppyWrite = 1;
	};
	(function () {
		"use strict";
		for (let i = 0; i < 2; i++) write();
	})();
	const self = function () {
		return typeof this;
	};
	(function () {
		"use strict";
		console.log(self());
	})();
}
run();
// Each of these runs otherwise in strict code, so it stays where it is.
function cases() {
	const frozen = Object.freeze({ x: 0 });
	const setMember = function () {
		frozen.x = 1;
		return frozen.x;
	};
	const deleteMember = function () {
		return delete frozen.x;
	};
	const callee = function () {
		return typeof arguments.callee;
	};
	const hoist = function () {
		{
			function inner() {}
		}
		return typeof inner;
	};
	const twice = function () {
		return (function (a, a) {
			return a;
		})(1, 2);
	};
	// A reserved word as a property name parses in strict code, so it moves.
	const members = function () {
		const object = JSON.parse('{"static":1,"implements":2}');
		return object.static + object.implements;
	};
	// This one runs alike, so nothing keeps it from moving.
	function declared() {
		let b = 1;
		b++;
		b += 1;
		for (var key in { k: 1 }) b += key.length;
		return (({ c }) => b + c)({ c: 1 });
	}
	(function () {
		"use strict";
		const out = [];
		try {
			out.push(setMember());
		} catch (error) {
			out.push(error.name);
		}
		try {
			out.push(deleteMember());
		} catch (error) {
			out.push(error.name);
		}
		out.push(callee(), hoist(), twice(), declared(), members());
		console.log(out.join());
	})();
}
cases();
// Sloppy code ignores these; strict code throws or fails to parse them.
function sloppyOnly() {
	const ownName = function () {
		return (function self() {
			self = 0;
			return typeof self;
		})();
	};
	const reserved = function () {
		return [1, 2]
			.map(function (implements) {
				return implements + [7].map(function (yield) {
					return yield;
				})[0];
			})
			.join();
	};
	const octal = function () {
		"\101";
		return [3].map(function (x) {
			return x + 1;
		})[0];
	};
	const forIn = function () {
		for (__forInWrite in { a: 1 });
		return typeof __forInWrite;
	};
	(function () {
		"use strict";
		console.log(ownName(), reserved(), octal(), forIn());
	})();
}
sloppyOnly();
// Moved into one that moves into strict code, it would run strict there too.
function chained() {
	const write = function () {
		__chainWrite = 1;
		return 7;
	};
	const call = function () {
		return write();
	};
	return (function () {
		"use strict";
		return call();
	})();
}
console.log(chained());
console.log(typeof __sloppyWrite, typeof __chainWrite);
delete __sloppyWrite;
delete __forInWrite;
delete __chainWrite;
