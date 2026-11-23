// A sign before a product, quotient or remainder goes to its left operand.
var values = [0, 1, -0, NaN, Infinity, null, undefined, true, "", "3", "foo", [2]];
values.forEach(function (a) {
	values.forEach(function (b) {
		console.log(+(a * b), +(a / b), +(a % b), -(a * b), -(a / b), -(a % b));
		console.log(1 + -(a * b), "s" + -(a / b), -(a % b) < 1);
	});
});
var log = [];
var counted = {
	valueOf: function () {
		log.push("left");
		return 3;
	}
};
function read() {
	log.push("right");
	return 2;
}
// The right side runs code, so the left operand converts after it.
console.log(-(counted * read()), log.join());
log = [];
console.log(-(2 * read()), log.join());
function kept(a, b) {
	var c = 3;
	// Each of these binds otherwise without the parentheses.
	console.log(-(-a * b), +(+a * b), -(a ** 2 * b), c ** -(a * b));
	console.log(!-(a * b), c * -(a * b), -(a * b) * b, typeof -(a * b));
	return -(a * b);
}
console.log(kept(2, 3), kept("4", "5"));
