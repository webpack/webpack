// A kept object nothing writes through prints its constant reads as values.
function called() {
	var o = { p: 1, f: function (v) { return 10 * v; } };
	return [o.p === o.p, o.f(o.p), o.f.length, typeof o.f];
}
console.log(called().join());
function self() {
	var o = { p: 1, f: function () { this.p = 2; } };
	o.f();
	return o.p + o.p;
}
console.log(self());
function named() {
	var o = { p: 1, f: function () { o.p = 3; } };
	o.f();
	return o.p + o.p;
}
console.log(named());
function nested() {
	var o = { p: 1, q: { r: 2 }, f: function () {} };
	o.q.r = 4;
	return [o.p, o.q.r, o.f.name].join();
}
console.log(nested());
function long() {
	var o = { s: "a longer string", f: function () {} };
	return [o.s, o.s, o.f.name].join();
}
console.log(long());
function early() {
	read();
	let o = { p: 1, f: function () {} };
	return o.p + typeof o.f;
	function read() {
		try {
			console.log(o.p);
		} catch (e) {
			console.log(e.name);
		}
	}
}
console.log(early());
function written() {
	var o = { p: 1, f: function () {} };
	for (o.p in { k: 1 });
	[o.f] = [5];
	return o.p + o.f;
}
console.log(written());
