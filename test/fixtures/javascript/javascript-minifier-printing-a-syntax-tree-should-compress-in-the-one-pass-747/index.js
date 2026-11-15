function a() { const { a: v, b: t = Object.defineProperty(v, "x", { get() { throw 1; } }), a: { x: unused, y: used } } = { a: { x: 0, y: 1 } }; return [t, used]; }
function b() { const { a: v, b: t = 1, a: { x: unused, y: used } } = { a: { x: 0, y: 1 } }; return [t, used]; }
function c() { const [p, q = g(), [r, s]] = [1, 2, [3, 4]]; return [q, s]; }
function d() { const { [g()]: k, a: { x: unused, y: used } } = { a: { x: 0, y: 1 } }; return [k, used]; }
function e(x = (() => { x = x; })()) { return 1; }
function h(x = 1, y = (() => { x = x; })()) { x = x; return y; }
function i() { const [, [r, s]] = [1, [3, 4]]; return s; }
function j(record) { const { a, b: { x: unused, y } } = { get a() { this.b = { get x() { record("x"); }, y: 2 }; return 1; }, b: { x: 0, y: 1 } }; return [a, y]; }
