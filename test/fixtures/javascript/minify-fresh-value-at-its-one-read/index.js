// A fresh object or array a name holds prints at its one read, where no loop,
// function or block stands between.
function h() {}
function g1() { var o = {}; h(); return o; }
function g2() { var o = []; for (;;) { return o; } }
function g3() { var o = [1]; { h(); } return o; }
function g5() { var o = {}; return /* kept */ o; }
function g6() { var o = []; return function () { return o; }; }
console.log(g1(), g2(), g3(), g5(), g6()());
