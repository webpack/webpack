function f() { for (var a = foo, b = a; bar;) return b }
function g() { for (let a = foo, b = a, c = bar, d = c; baz;) return [b, d] }
function h() { for (let a = foo(), b = a; bar; b++) use(() => b) }
function k() { for (let a = foo(), b = a.x, c = 1; c; c--) use(a, b) }
function m(o) { for (let a = o, b = a; o;) return b }
function n() { for (let a = foo(), b = a, c = 1; c; c--) use(c) }
