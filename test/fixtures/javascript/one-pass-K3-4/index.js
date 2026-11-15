function f(e, o) { e ? console.log(e) : console.log(JSON.stringify(o)); }
function g(e) { return e ? Math.max(1, e) : Math.max(2, e); }
function h(e, o) { e ? o.log(1) : o.log(2); }
function k(e) { e() ? console.log(1) : console.log(2); }
function l(e) { e ? console[e](1) : console[e](2); }
f(0, { a: 1 });
f("x");
console.log(g(5), g(0));
