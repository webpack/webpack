function f(a) { var n, m; return (n = a.x) == null ? void 0 : m.y; }
function g(a) { return (x = a.x) == null ? void 0 : x.y; }
function h(a) { var n; return (n = a.x) != null ? m : 7; }
function k(a) { var n; return (n += a.x) == null ? void 0 : n.y; }
function l(a) { var n; with (a) return (n = a.x) == null ? void 0 : n.y; }
function r(a) { var eval; return (eval = a.x) == null ? void 0 : eval(1); }
function s(a, b) { var n; return (n = a.x) == b ? void 0 : n.y; }
function t(a, b) { var n; return (n = a.x) === null || b ? void 0 : n.y; }
function u(a) { var n; return (n = a.x) == null ? void 0 : (0, n.y); }
