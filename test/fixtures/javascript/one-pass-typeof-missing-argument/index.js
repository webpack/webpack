// A call passing nothing prints as the `typeof` its function returns.
console.log(
	(function (a) {
		return typeof a;
	})()
);
console.log(
	(function long_name(long_name) {
		return typeof long_name;
	})()
);
// A `typeof` of an operation, or of a name something may set, stays a call.
console.log(
	(function (a) {
		return typeof -a;
	})()
);
console.log(
	(function (a) {
		eval("a = 1");
		return typeof a;
	})()
);
console.log(
	(function (a) {
		arguments[0] = 1;
		return typeof a;
	})()
);
console.log(
	(function (x) {
		return typeof x;
	})(function () {})
);
