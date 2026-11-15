var log = [];
function f(v) { log.push(v); return v; }
// An `if` printing its test alone takes no `else` after it: the body keeps no braces.
for (var i = 0; i < 2; i++) {
	if (i) for (var j = 0; j < 1; j++) if (f(1), false) f(2); else "dropped";
	else f(3);
}
if (log.length) if (f(4)) "kept"; else "dropped"; else f(5);
console.log(log.join());
