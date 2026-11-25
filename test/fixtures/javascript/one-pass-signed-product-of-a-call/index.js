function f(a, b, c) {
	return 1 + -(a * b() * c);
}
console.log(
	f(
		{
			valueOf() {
				console.log("a");
				return 2;
			}
		},
		function () {
			console.log("b");
			return 3;
		},
		4
	)
);
