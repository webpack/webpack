// A number plus a negated name, member or call prints as a subtraction.
function f(a, b, o) {
	return [--b + -a, b * 2 + -o.n, b-- + -a, -b + -g(a), b + -a, b - 1 + -(a + 1)];
}
function g(a) {
	return a * a;
}
function big(a, b) {
	return [--b + -a, b * a + -a, ~b + -g(a)];
}
console.log(f(1, 10, { n: 4 }), f(2, 20, { n: "5" }));
console.log(f("3", "30", { n: { valueOf: function () { return 6; } } }));
console.log(big(BigInt(1), BigInt(10)).join(), big(BigInt(2), BigInt(20)).join());
