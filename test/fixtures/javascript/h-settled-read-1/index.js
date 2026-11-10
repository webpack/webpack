class S {}
S;
function f() { let x = g(); x; h(x); }
// Read before its declaration, or where a case may skip it, a name throws.
function k() { y; let y = 1; }
function m(a) { switch (a) { case 1: let z = g(); break; case 2: z; } }
function n() { for (;;) { w; let w = 1; } }
