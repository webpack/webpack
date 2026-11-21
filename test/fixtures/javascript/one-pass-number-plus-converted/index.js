// A number added to a converted or negated value: the sum commutes, and
// adding a negation subtracts.
var values = [0, -0, 1, "2", "x", null, undefined, true, [3], NaN, Infinity];
values.forEach(function (a) {
	console.log(1 + +a, 1 + -a, "s" + (1 + +a), 1 + +a + "s", 0.5 + +a);
	console.log(1 / (0 + +a), 1 / (0 + -a), 2 - (1 + +a), -0 + +a);
});
var counted = {
	valueOf: function () {
		console.log("converted");
		return 4;
	}
};
console.log(1 + +counted, 1 + -counted);
var held = {
	get p() {
		console.log("read");
		return "3";
	}
};
console.log(1 + +held.p, 1 + -held.p);
