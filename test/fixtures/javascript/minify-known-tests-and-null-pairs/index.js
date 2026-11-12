// An `if` whose test is known prints the branch it picks, its test kept only
// where it runs something; a branch of `?:` takes it parenthesized.
function k1(c) { if (c) { if ([]) a(); else b(); } else b(); }
function k2(c) { if (c) { if ((x(), [])) a(); else b(); } else b(); }
function k3() { if ([]) ({}).p = a(); else b(); }
function k4() { if ([]) { a(); } else b(); }
function k5() { if ((x(), [])) { a(); } else b(); }
// A null check paired with an undefined check of the same name prints as
// one `==`, the name it assigns included.
function n1(t) { return t === null || t === void 0; }
function n2(t) { return t !== null && t !== void 0; }
function n3() { var t; return (t = g()) === null || t === void 0 ? 0 : t.p; }
function n4(t) { return c() || t === void 0 || t === null; }
function n5(t) { return (t.p = g()) === null || t === void 0; }
function n6(t) { return (t += g()) === null || t === void 0; }
function n7(t, u) { return t === null || u === void 0; }
// An `else` a nested `if` printing none of its own would take.
function e1(c, d) { if (c) if (d) a(); else; else b(); }
function e2(c, d) { if (c) while (x()) if (d) a(); else if (0) b(); else; else e(); }
function e3(c, d) { if (c) if (d) a(); else if (d()) a(); else b(); else e(); }
