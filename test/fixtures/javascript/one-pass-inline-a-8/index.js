function f(x) {
	(function (a, b) {
		console.log(b);
	})(3, x);
}
f([1]);
f([2]);
