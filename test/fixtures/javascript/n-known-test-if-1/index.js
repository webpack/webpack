var log = [];
function f(v) { log.push("f" + v); return v; }
if (f(1), false) log.push("a"); else log.push("b");
if (f(2), true) log.push("c"); else log.push("d");
if (f(3), 1) log.push("e");
if (f(4), 0) log.push("g");
if (f(5) && false) { log.push("h"); } else { log.push("i"); }
if (f(6) || true) log.push("j"); else { log.push("k"); log.push("l"); }
if (f(7)) log.push("m"); else if (f(8), 0) log.push("n"); else log.push("o");
for (var i = 0; i < 2; i++) if (f(9), !1) log.push("p"); else "q";
// What declares a `var` or leaves keeps its branch.
if (f(10), 0) { var kept = 1; } else log.push("r");
function g() { if (f(11), 0) return; else log.push("s"); }
g();
// Next to no other `if`, one with no `else` prints shorter.
if (f(12), 1) log.push("t");
console.log(log.join(), kept);
