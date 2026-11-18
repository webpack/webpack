// A call of a function read off an object literal written in place calls
// it there: it prints as what the function returns, or its statements.
var log = [];
console.log({ p: function () { return 42; } }.p());
console.log({ p: "FAIL", p: function () { return 42; } }.p());
console.log({ q: 1, p: () => 42 }.p());
console.log({ p: function (x) { return x * 2; } }.p(21));
({ p: function () { log.push("statement"); } }).p();
console.log(log.join());
// So does one read off a name the literal moves to, read once.
function moved(x) {
	var o = { p: function (y) { return y * 2; } };
	return o.p(x);
}
console.log(moved(21));
function movedStatement() {
	var o = { p: function () { log.push("moved"); } };
	o.p();
}
movedStatement();
function movedObject() {
	var o = { p: function () { return { a: 1 }; } };
	return o.p().a;
}
console.log(movedObject());
console.log(log.join());
// A function reading `this`, a value that runs, a getter, a method or the
// prototype a literal sets keeps the call.
console.log({ p: function () { return this.q; }, q: 1 }.p());
console.log({ q: log.push("value"), p: function () { return 1; } }.p());
console.log({ p: () => 1, get q() { log.push("getter"); return 2; } }.p());
console.log({ p() { return 3; } }.p());
console.log({ __proto__: { p: function () { return 4; } } }.p());
console.log({ p: function () { return arguments.length; } }.p(1, 2));
console.log(log.join());
