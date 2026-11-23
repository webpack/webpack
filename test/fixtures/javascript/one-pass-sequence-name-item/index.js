function log() {
	console.log.apply(console, arguments);
}
function pair(a) {
	var b,
		c = 1;
	log((b, a), c);
	return [(b, a), c];
}
console.log(pair(1), pair(2));
function declared(a) {
	var b, c;
	var d = (b, c, a);
	log(d, d);
}
declared(3);
declared(4);
function written(a) {
	var b, c;
	b = log("set");
	log((b, a), c);
}
written(6);
written(7);
function closure(a) {
	var b,
		c = 8;
	log((b, a), c);
	function read() {
		return b;
	}
	log(read());
}
closure(9);
closure(10);
function evaluated(a) {
	var b,
		c = 11;
	eval("b = 12");
	log((b, a), c, b);
}
evaluated(13);
evaluated(14);
