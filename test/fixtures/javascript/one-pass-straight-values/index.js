// A local each write sets to a known primitive reads what it holds there.
function updated() {
	var a = 1, b = 2;
	b++;
	console.log(a + 1);
	console.log(b + 1);
}
updated();
function chained() {
	var a = 1, b = 2, c = 3;
	b *= c;
	if (a) {
		b = c;
	} else {
		c = b;
	}
	console.log(a + b, b + c, { b: b }, b.toFixed(1));
}
chained();
!(function (a, b) {
	b++;
	console.log(a - 1, b * 1);
})(1, 2);
!(function () {
	var a;
	if ((a = 2)) console.log(a);
})();
function dead(x) {
	var b = 1;
	b--;
	console.log(b);
	return;
	b = x;
	console.log(b);
}
dead(5);
// A `var` declared again with no value sets nothing; a `for`-`in` sets it.
function declaredAgain(x) {
	var b = 2;
	if (x) var b;
	else var b;
	for (var b; x; ) x--;
	console.log(b + 1);
}
declaredAgain(2);
function forIn(o) {
	var k = 2;
	k++;
	for (var k in o);
	console.log(k);
}
forIn({ key: 1 });
// A string a loop's head sets once reads as itself in the loop.
function matches(r) {
	for (var m, s = "abcabc"; (m = r.exec(s)); ) console.log(m.index);
}
matches(/b/g);
function suffixed() {
	var s = "a";
	s += "b";
	console.log(s);
}
suffixed();
// What another function, a loop or a branch may set keeps the name.
function kept(x) {
	var a = 1, b = 1, c = 1, d = 1;
	a++;
	x(function () {
		a = 7;
	});
	for (; x.n--; ) b++;
	try {
		c = 5;
		x.f();
	} catch (e) {}
	x.n && (d = 2);
	console.log(a, b, c, d);
}
kept(Object.assign(function (f) { f(); }, { n: 2, f: function () { throw 0; } }));
function negative() {
	var a = -1;
	a--;
	console.log(a.toFixed(1));
}
negative();
function converted(o) {
	var a = 1;
	console.log(a);
	a *= o;
}
converted({ valueOf: function () { console.log("valueOf"); return 2; } });
