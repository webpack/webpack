// A sloppy function's parameter read before a folded value stays before it
// where the value may set it through `arguments`.
function set(list) { list[0] = 9; }
function f1(a) { var v = (arguments[0] = 2, 3); return a + v; }
function f2(a) { var v = set(arguments); return a + v; }
function f3(a) { var v = ([arguments[0]] = [4], 1); return a + v; }
function f4(a) { var v = arguments[0]++; return a + v; }
function f5(a) { var v = arguments[1](); return a + v; }
function f6(a) { var v = arguments[1]`t`; return a + v; }
function f7(a) { var v = arguments[(arguments[0] = 5, 1)](); return a + v; }
function f8(a) { var v = arguments.length; return a + v; }
function f9(a) { var v = function () { arguments[0] = 1; }(); return a + v; }
function f10(a) { var v = (arguments.x = 1); return a + v; }
function f11(a) { var v = ({ p: arguments[0] } = { p: 6 }, 1); return a + v; }
function f13(a) { var v = arguments[(arguments[0] = 5, 0)]; return a + v; }
function f12(a, b) { var v = b + 1; return a + v; }
function k() { return 1; }
console.log(f1(1), f2(1), f3(1), f4(1), f5(1, k), f6(1, k), f7(1, k), f8(1), f9(1), f10(1), f11(1), f12(1, 2), f13(1));
