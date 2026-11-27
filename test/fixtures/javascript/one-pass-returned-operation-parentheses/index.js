// A compound assignment a function returns last prints as its operation,
// taking the parentheses that operation takes, not those of a write.
function shifted(flag, value) {
	return flag && (value >>= 5);
}
console.log(shifted(1, 64), shifted(0, 64));
function branches(flag, value) {
	return flag ? (value += 1) : (value -= 1);
}
console.log(branches(1, 4), branches(0, 4));
function either(flag, value) {
	return flag || (value *= 2);
}
console.log(either(0, 4), either(3, 4));
function added(flag, value) {
	return flag + (value *= 2);
}
console.log(added(1, 4));
var arrow = (flag, value) => flag && (value <<= 1);
console.log(arrow(1, 3), arrow(0, 3));
function dropped(a, b, c) {
	return (a = first()), (b = second()), (b = a && (c >>= 5));
}
function first() {
	return 1;
}
function second() {
	console.log("second");
}
console.log(dropped(1, 2, 64));
function kept(flag, value) {
	try {
		return flag && (value >>= 1);
	} finally {
		console.log("finally", value);
	}
}
console.log(kept(1, 8));
