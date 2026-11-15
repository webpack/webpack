function a() { (function () { x(); })(function () {}); }
function b() { (function () { x(); })(1, "s", () => {}); }
function c() { return (function () { return x; })(2); }
function d() { (function () { x(); })(y); }
function e() { (function () { x(); })(function () { y(); }); }
function f() { (function () { x(arguments); })(1); }
