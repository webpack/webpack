var log = [];
function f(v) { log.push(v); }
// A case testing a constant the known value never is labels nothing.
function a(t) { switch (true) { case t: f(1); break; case false: f(2); break; } }
function b(t) { switch (1) { case 2: f(3); case t: f(4); break; case 3: f(5); default: f(6); } }
// One before the first label keeps it where it prints anything.
function c(t) { switch (1) { case 2: var v = 1; case t: f(v); } }
a(true); a(false); b(1); b(2); c(1);
console.log(log.join());
