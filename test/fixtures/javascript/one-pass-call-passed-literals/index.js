// A call passing literals to a function returning what its parameters fold
// to prints that value, each parameter read as the literal passed.
function compare() {
	const isUnder = (accuracy) => 75 <= accuracy;
	return [isUnder(0), isUnder(100)];
}
function add() {
	const inc = (x) => x + 1;
	const scale = (a, b = 2) => a * b;
	const shout = (text) => text + "!";
	return [inc(1), inc(2), scale(3), scale(3, 4), shout("hi"), shout(1)];
}
function declared() {
	function half(value) {
		return value / 2;
	}
	return half(9) + half(1);
}
// A name, a call or a member in what it returns keeps the call.
function kept(unknown) {
	const inc = (x) => x + 1;
	const read = (text) => text.length;
	const run = (x) => [x].concat(1);
	return [inc(unknown), read("abc"), run(2)];
}
console.log(compare(), add(), declared(), kept(5));
