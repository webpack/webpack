var log = [];
function f(v) { log.push(v); return v; }
function a(x) { switch (x) { case 1: const ignored = "x"; f(1); f(2); } }
function b(x) { switch (x) { case 1: let y = f(3); f(4); break; case 2: f(5); } }
// A name another case reads in its dead zone keeps its declaration.
function c(x) { switch (x) { case 1: let z = 6; f(z); break; case 2: try { f(z); } catch (e) { f("tdz"); } } }
let w = 1;
switch ("w") { case "w": let w = 2; break; }
switch (1) { case 1: let v = 7; f(8); }
a(1); b(1); b(2); c(1); c(2);
console.log(log.join(), w);
