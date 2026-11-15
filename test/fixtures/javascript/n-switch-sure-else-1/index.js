var log = [];
function f(v) { log.push(v); }
// A case surely matching where the one before does not runs as a `default`.
function a(t) { switch (1) { case t: f("t"); break; case 1: f("one"); } }
function b(t) { switch (1) { case t: f("t"); case 1: f("one"); } }
// An empty case testing what runs nothing falls into the `default` after it, the last.
function c(t, u) { switch (true) { case u: f("u"); break; case t: default: f("d"); } }
// Before a case after it, it keeps its label.
function d(t, u) { switch (u) { case t: default: f("e"); break; case 1: f("1"); } }
a(1); a(2); b(1); b(2); c(true, false); c(false, true); d(1, 1); d(2, 1);
console.log(log.join());
