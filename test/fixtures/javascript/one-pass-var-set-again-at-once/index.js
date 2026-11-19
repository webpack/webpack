// A `var`'s value running no code goes where the next statement sets the name again first.
function earlier(b) {
	var a = b + 1,
		c = "FAIL";
	c = a;
	console.log(a, c);
	return [a, c];
}
function constant() {
	var a = [],
		c = 1;
	c = "two";
	return [a, c, c];
}
function reads(b) {
	var a = 1;
	a = a + b;
	return [a, a];
}
function runs(g) {
	var a = 1;
	a = g();
	return [a, a];
}
console.log(earlier(1), earlier(2), constant(), constant(), reads(3), reads(4));
console.log(
	runs(function () {
		return 5;
	}),
	runs(function () {
		return 6;
	})
);
