var log = [];
function f(n) {
	log.push(n);
	return n;
}
function conditional(x) {
	var b = x ? f(1) : 0;
	f(2);
}
function logical(x) {
	var b = x || f(3),
		c = x && f(4);
	f(5);
}
function sequence(x) {
	var b = (f(6), x ? f(7) : 0);
	return x;
}
function kept(x) {
	var b = x ? f(8) : 0;
	return b;
}
conditional(0);
conditional(1);
logical(0);
logical(1);
console.log(sequence(0), sequence(1), kept(0), kept(1), log.join());
