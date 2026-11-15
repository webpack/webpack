function a(x, y) { return (0 | !(x < 0)) ^ y; }
function b(x, y) { return y ^ (0 | !x); }
function c(x) { return (0 | !x) & 1; }
function d(x, y) { return (0 | x * y) ^ 1; }
function e(x, y) { return (0 | x) ^ y; }
function f(x) { return (0 | x) ^ 1n; }
function g(x, y) { return (0 | -x) << y; }
