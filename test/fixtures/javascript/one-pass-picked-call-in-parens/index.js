// A function read off a literal and called prints in parentheses, after what
// the values set before it run.
var log = [];
function note(x) {
	log.push(x);
	return x;
}
console.log({ p: async () => await note("async") }.p() instanceof Promise);
console.log({ a: note("a"), p: function () { return 42; } }.p());
console.log({ a: note("b"), b: note("c"), p: () => note("d") }.p());
console.log({ a: note("e"), p() { return note("f"); } }.p());
console.log({ a: new Date(0).getTime(), p: function () { return 1; }, q: 2 }.p());
console.log({ a: Math.floor(note(1.5)), p: function q() { return typeof q; } }.p());
console.log({ a: note("g"), p: function () { return 3; } }.p(note("h")));
console.log(1 + { a: note("i"), p: () => 2 }.p() * 3, typeof { a: note("j"), p: () => 0 }.p());
// What stays: a `this`, `arguments` or `eval` read, code after the function,
// a key or value that may run code, a comment, or a call that is optional.
console.log({ a: note("k"), p: function () { return this === undefined; } }.p());
console.log({ a: note("l"), p: function () { return arguments.length; } }.p(1, 2));
console.log({ a: note("m"), p: function () { return typeof eval; } }.p());
console.log({ a: note("n"), p: () => 4, q: note("o") }.p());
console.log({ a: note("p"), [note("q")]: 1, p: () => 5 }.p());
console.log({ a: note("r"), get g() { return 1; }, p: () => 6 }.p());
console.log({ a: note("s"), ...log, p: () => 7 }.p());
console.log({ a: note("t"), p: () => 8, p: () => 9 }.p());
console.log({ a: note("u"), /*! kept */ p: () => 10 }.p());
console.log({ a: note("v"), p: function* () { yield 11; } }.p().next().value);
console.log({ a: note("w"), p: () => 12 }.p.call(null));
console.log({ a: (note("x"), note("y")), p: () => 13 }.p());
console.log({ a: function () { note("z"); return note("z2"); }(), p: () => 14 }.p());
function once() {
	return note("once");
}
console.log({ a: once(), p: () => 15 }.p());
var made = function () {
	return note("made");
};
console.log({ a: made(), p: () => 16 }.p());
var holder = { f: function () { return note("held"); } };
console.log({ a: holder.f(), p: () => 17 }.p());
note({ a: console.log("logged"), p: () => 18 }.p());
({ a: note("statement"), p: () => 19 }).p();
console.log(log.join(","));
