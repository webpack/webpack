// A case's test setting a name prints in parentheses beside `===`.
var a;
function one(x) {
	switch (x) {
		case a = 1:
			console.log("one", a);
			break;
		default:
			console.log("other", a);
	}
}
one(1);
one(2);
(function (b) {
	switch (1) {
		case b = 1:
			console.log(b);
			break;
		default:
			console.log(2);
			break;
	}
})(1);
var o = {
	set v(value) {
		console.log("set", value);
	}
};
function member(x) {
	switch (x) {
		case o.v = 2:
			console.log("matched");
			break;
		default:
			console.log("missed");
	}
}
member(2);
member(3);
var count = 0;
function counted(x) {
	switch (x) {
		case count += 1:
			return "hit" + count;
		default:
			return "miss" + count;
	}
}
console.log(counted(1), counted(1), counted(3));
function alone(x) {
	switch (x) {
		case a = x && 2:
			console.log("alone", a);
	}
}
alone(5);
alone(0);
