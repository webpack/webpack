// A test `!(a==b)` prints as `a!=b`, which negating to swap the branches flips back.
function loose(a, b) {
	if (!(a == b)) {
		1;
	} else {
		return "B";
	}
}
console.log(loose(1, 2), loose(1, 1));
function strict(a, b) {
	if (!(a === b)) {
	} else {
		return "B";
	}
}
console.log(strict(1, 2), strict(1, 1));
function looseNot(a, b) {
	if (!(a != b)) 1;
	else return "B";
}
console.log(looseNot(1, 2), looseNot(1, 1));
function strictNot(a, b) {
	if (!(a !== b));
	else return "B";
}
console.log(strictNot(1, 2), strictNot(1, 1));
// A branch left after the swap runs on the other side.
var calls = 0;
function kept(a, b) {
	if (!(a == b)) {
		calls++;
	} else {
		return "B";
	}
}
console.log(kept(1, 2), kept(1, 1), calls);
function other(a, b) {
	if (!(a == b)) calls++;
	else calls--;
}
other(1, 2);
other(1, 1);
console.log(calls);
