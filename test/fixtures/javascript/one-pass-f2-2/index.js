function A(a, b) { this.a = a; }
function R(...r) { this.r = r; }
function D(a = arguments[1]) { this.a = a; }
class P extends Q {}
class S { constructor() { this.n = arguments.length; } }
out.a = new A(1, 2, 3);
out.r = new R(1, 2);
out.d = new D(void 0, 2);
out.p = new P(1, 2);
out.s = new S(1, 2);
out.l = new (class { constructor() { this.f = () => arguments; } })(1, 2);
out.u = new A(...v, 1);
out.A = A; out.R = R; out.D = D; out.P = P; out.S = S;
