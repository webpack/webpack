var log = [];
function f(n) {
	log.push(n);
	return n;
}
function thrown() {
	var x = "FAIL";
	try {
		class X {
			static a = f(1);
			static b = f(thrown.missing());
		}
	} catch (e) {
		x = "PASS";
	}
	return x;
}
function assigned() {
	var x = "FAIL",
		y = 0;
	class X {
		static a = (x = "PASS");
		static b = y++;
	}
	return x + y;
}
function kept() {
	class X {
		static a = (undeclaredName = 1);
		static b = function () {
			return this;
		}.call();
	}
	return typeof undeclaredName;
}
function nested(n) {
	class X {
		static a = "X";
		static Y = class extends this {};
	}
	return log.push(n);
}
console.log(thrown(), assigned(), kept(), nested(1), log.join());
console.log(thrown(), assigned(), nested(2), log.join());
// A class body is strict: setting a read-only global there throws.
var NaN;
try {
	class C {
		[(NaN = 1)]() {}
	}
} catch (e) {
	console.log(e.name);
}
console.log(NaN);
