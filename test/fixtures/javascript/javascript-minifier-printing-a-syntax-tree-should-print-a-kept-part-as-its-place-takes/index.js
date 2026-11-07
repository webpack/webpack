const s = (g(), h());
!/*@__PURE__*/ f(g(), h());
/*@__PURE__*/ f((g(), h()));
[(a, b)];
f(0 || ([a] = [1]), 1 && ({ b } = { b: 2 }), 0 || ([c] = [1]));
x = a ? (y = 1) || c : c;
x = a ? c : (f(), c);
(0 || g)``;
(1 && (a, b))``;
x = ({} ?? 1).y;
x(((() => {}) ?? 1));
a = -(1 && -b);
for ((a in b); c; ) break;
x = !(a || !(b in c));
x = (a < b ? !0 : !1) && c;
if (!!(!b && c)) f();
-(a(), -b);
void { a: g() }.b;
delete { a: g() }.b.c();
if ({ m() {} }?.m()) a(); else b();
!!(function () { g(); }() == x);
x = !!(function () { g(); }() == x);
a = c; a ? 1 : 1;
function k(i) { var x = i++; return x ** 2; }
function n() { var t = function () { return 1; }; return t().a; }
x = new (Array(1, 2));
x = new (function (z) { this.b = 1; })(1);
k(1), n();
x = { k: 0 || (a = 1), [0 || (b = 1)]: 1 };
x = a ? c : (f(1)(2), c);
x = a ? c : (g() + 1, c);
if (x) {
	if ({}.a) b();
	else c();
	y();
}
x = new F(1);
