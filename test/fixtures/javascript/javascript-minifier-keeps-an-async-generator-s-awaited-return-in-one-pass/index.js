// An async generator awaits what it returns, `undefined` too, a tick its
// `return;` or end takes not: the order below logs `t1` before `done`.
async function* a(x) { return (() => {})(x); }
async function* b(x) { if (x) return (() => {})(x); note("b"); }
async function* c(x) { note("c"); return (() => {})(x); }
async function d(x) { return (() => {})(x); }
var log = [];
function note(s) { log.push(s); }
[a, b, c, d].forEach(function (f) {
	var order = [];
	var it = f(1);
	(it.next ? it.next() : it).then(function () { order.push("done"); });
	Promise.resolve()
		.then(function () { order.push("t1"); })
		.then(function () { order.push("t2"); })
		.then(function () { console.log(order.join()); });
});
