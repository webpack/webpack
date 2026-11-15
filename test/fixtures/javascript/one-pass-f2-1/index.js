function F(a) { this.a = a; }
class C { constructor(a) { this.a = a; } }
class B {}
out.f = new F(1, 2, g(), 3);
out.c = new C(1, 2, [h()], { k: !k() }, void m());
out.b = new B(1, 2);
out.e = new (function () { this.e = 1; })(1, 2);
out.x = new (class { constructor() { this.x = 1; } })(1, 2);
out.d = new (function ({ value }) { this.value = value; })({ value: 1 }, 2, 3);
out.F = F;
out.C = C;
