var v = !!(a == b || c == d);
var w = !!(a == b && (c < d || e in f));
var x = !!(a == b ? c == d : !e);
var y = !!(a == b || c);
var z = [!!(g(a, b) == b || c == d)];
var u = p && !!(a == b || c == d);
var t = Boolean(a == b || c == d);
var s = !!(a == b || c == d) + 1;
console.log(v, w, x, y, z, u, t, s);
