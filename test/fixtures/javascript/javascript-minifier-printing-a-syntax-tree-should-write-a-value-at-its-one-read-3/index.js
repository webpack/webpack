function a() { var x = {}; for (var k in x) use(k) }
function b() { var x = k; for (var k of x) use(k) }
function c() { let x = k; for (let k of x) use(k) }
function d() { var x = j; for (var i = x; i < 9; i++) { let j; use(i) } }
function e(o) { var x = "k" in o; for (var i = x; i;) use(i) }
function f() { var x = g(); for (let i = x; i;) use(() => i) }
function h() { var x = g(); for (var k = 1 in x) use(k) }
function i(o) { var x; x = g(); for (o.k in x) use(o) }
function j() { let x = g(); for (let i = () => x; ;) use(i) }
function k() { let x = g(); for (const [a] of x) use(a) }
function l() { var i, x = g(); for (i = x; i;) use(i) }
