function f1(x = (a) = 1) {}
function f2(x = [(a)] = 1, y = { b: (a) } = 1) {}
function f3([x = (a) = 1], { y = (a) = 1 }, ...[z = (a) = 1]) {}
(function (x = f((a) = 1)) {});
({ m(x = (a) = 1) {} });
class A { m(x = (a) = 1) {} }
