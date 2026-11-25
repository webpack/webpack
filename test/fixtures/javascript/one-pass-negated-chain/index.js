var n = 0;
(function () {
	for (var key in { a: 1 }) n++;
	return function (k) {
		console.log("called", k, n);
	};
})()(5);
(function () {
	for (var key in { a: 1 }) n++;
	return {
		get x() {
			console.log("getter");
			return 1;
		}
	};
})().x;
(function () {
	for (var key in { a: 1 }) n++;
	return [
		function () {
			console.log("element");
		}
	];
})()[0]();
(function () {
	for (var key in { a: 1 }) n++;
	return {
		m: function () {
			console.log("method", this.v);
		},
		v: 7
	};
})().m();
if (n)
	(function () {
		return function () {
			console.log("if");
		};
		function unused() {}
	})()();
(function () {
	for (var key in { a: 1 }) n++;
	return console.log;
}).call(0)("call");
(function () {
	for (var key in { a: 1 }) n++;
	return function () {
		console.log("optional");
	};
})()?.();
console.log(n);
