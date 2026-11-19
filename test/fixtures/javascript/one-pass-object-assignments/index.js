function joined() {
	var o = { foo: 1 };
	o.bar = 2;
	o.baz = 3, o["q x"] = 4, o[5] = 5;
	console.log(o.foo, o.bar + o.bar, o.foo * o.bar * o.baz, o["q x"], o[5]);
}
function replaced() {
	var o = { a: 1, b: [2] };
	o.a = 3;
	o[0] = 0, o[-0] = 1, o[-1] = 2, o[void 0] = 4, o[null] = 5;
	console.log(Object.keys(o).join(), o.a, o[0], o[-1], o.undefined, o.null);
}
function inHeads() {
	var o = { p: 3 };
	for (o.q = "foo"; o.p-- > 1; ) console.log(o.q);
	var r = {};
	for (var key in r.a = "PASS", r) console.log(key, r[key]);
	var s = {};
	if (s.x = 1, s.y = "Y") console.log(s.x, s.y);
	var t = { p: 3 };
	return t.q = /foo/, t.r = "bar", t.p + t.r + t.q.source;
}
function kept() {
	var o = { get a() { return "getter"; } };
	o.a = 2;
	o.b = 3;
	var f = {};
	f.anonymous = function () {};
	f.arrow = () => {};
	var q = {};
	q.self = q;
	q.called = String(1);
	console.log(o.a, o.b, f.anonymous.name, f.arrow.name, q.self === q, q.called);
}
let declared = {};
declared.value = "let";
const constant = {};
constant.value = "const";
var run = [joined, replaced, inHeads, kept];
for (var i = 0; i < run.length; i++) console.log(run[i]());
console.log(declared.value, constant.value);
