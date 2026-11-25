// Values of declarators that go join the value of the next one listed.
var log = function (x) {
	console.log(x);
	return x;
};
function plain() {
	var a = log(1),
		unused = log(2),
		alsoUnused = log(3),
		{} = log({}),
		b = log(4);
	return a + b;
}
console.log(plain());
function patterned() {
	let a = log(1),
		unused = log(2),
		[b] = log([5]);
	return a + b;
}
console.log(patterned());
function bare() {
	var a = log(1),
		unused = log(2),
		b,
		c = log(3);
	while (a--) b = log(a);
	return [b, c];
}
console.log(bare());
function bareLast() {
	var a = log(1),
		unused = log(2),
		b;
	while (a--) b = log(a);
	console.log(b);
}
bareLast();
function bareLexical() {
	let a = log(1),
		unused = log(2),
		b;
	while (a--) b = log(a);
	console.log(b);
}
bareLexical();
function commented() {
	var a = log(1),
		unused = /*! kept */ log(2),
		[b] = log([3]);
	return a + b;
}
console.log(commented());
function deadZone() {
	let a = log(0),
		unused = (function () {
			try {
				log(c);
			} catch (e) {
				log("tdz");
			}
		})(),
		c = log(a);
	console.log(a, c);
}
deadZone();
function* gen() {
	var a = yield 1,
		unused = yield 2,
		b = yield 3;
	console.log(a, b);
}
var it = gen();
it.next();
it.next("a");
it.next("b");
it.next("c");
