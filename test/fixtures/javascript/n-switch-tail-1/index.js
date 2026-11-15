var log = [];
function f(v) { log.push(v); return v; }
// The last case of a `switch` ending a function falls out of it.
function a(x) { switch (x) { case 1: return; } }
function b(x) { switch (x) { case 1: f(1); return; case 2: f(2); return; } }
function c(x) { switch (x) { case 1: { f(3); return; } } }
function d(x) { for (var i = 0; i < 2; i++) { switch (x) { case 1: f(4); continue; } } }
// A case's block of one statement prints bare as an `if`'s body.
function e(x) { switch (x) { case 3: { for (var y of [5]) { f(y); break; } } } }
a(1); b(1); b(2); c(1); d(1); e(3);
console.log(log.join());
