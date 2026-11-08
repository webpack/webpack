x = (function f(a) { return g(a + 1); })(2);
y = (function f(a) { if (a) f(a - 1); return g(a); })(2);
z = (function f(a) { return g(a, f); })(2);
