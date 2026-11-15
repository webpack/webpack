function f(a) { var n; return (n = a.x) == null ? void 0 : n.y(); }
function g(a) { var n; return (n = a.x) === null || n === void 0 ? void 0 : n.y; }
function h(a) { var n; return (n = a.x) !== null && n !== void 0 ? n[0] : void 0; }
function k(a) { var n; return null == (n = a.x) ? void 0 : n(1); }
function l(a) { var n; return void 0 != (n = a.x) ? n.y : void 0; }
function m(a) { var n; return (n = a.x) != null ? n : 7; }
function p(a) { var n; (n = a.x) == null || n.y(); }
function q(a) { var n; if ((n = a.x) != null) n.y(); }
console.log(f({ x: { y: () => 1 } }), f({}), g({ x: { y: 2 } }), h({ x: [3] }), k({ x: (v) => v }), l({}), m({ x: 0 }));
p({ x: { y: () => console.log("p") } });
q({ x: { y: () => console.log("q") } });
p({});
q({});
