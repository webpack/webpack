// A sequence a statement does not hold folds an assignment into the item after it.
var a;
function f(b) {
	return [b, b, b];
}
for (var c in (a = console, f(a))) console.log(c);
function g(h, b, d) {
	var x;
	for (var k of (x = h(), f(x))) console.log(k);
	var y;
	for (var j in (y = h(), y)) console.log(j);
	var z;
	for (var i in (z = h(), f(z))) console.log(i, z.length);
	console.log((b = h(), f(b)), [(d = h(), d.length)]);
	if ((b = h(), b === "ab")) console.log("same");
	console.log(typeof (b = h(), b), (b = h(), b.length) ? 1 : 2);
	var e = (b = h(), f(b));
	console.log(e, ((b = h()), b++, b), ((d = h()), (b = d.length), f(b)));
	console.log(-(b = h(), b.length + 1), (b = h(), b) + 1, 2 * (b = h(), b.length + 1));
	console.log(c ? (b = h(), b) : 2, x ? 1 : (b = h(), b), b);
	var o = {
		m: function () {
			return this === o;
		}
	};
	console.log((b = o, b.m)(), (b = o, b).m(), (b = h(), b)[0]);
	console.log(((d = h()), [d.length]), ((d = h()), { n: d }).n);
	switch (((d = h()), d)) {
		case ((b = h()), f(b)):
			console.log("never");
			break;
		case ((b = h()), b):
			console.log("case", `${((d = h()), d)}`);
	}
	console.log(x || ((b = h()), b), ((d = h()), [...d]));
}
g(function () {
	return "ab";
});
g(function () {
	return "cd";
});
function m(n, p) {
	return n ? n++ : ((p = f), p(n));
}
console.log(m(1), m(0));
