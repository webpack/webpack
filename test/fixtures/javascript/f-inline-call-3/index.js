function a() { (function () { var v = f(); if (v) g(v); })(); x(); }
function b() { (function () { var v = f(); if (v) g(v); })(); v(); }
function c(v) { (function () { var v = f(); if (v) g(v); })(); x(v); }
function d() { (function () { var v = f(); if (v) g(v); })(); (function () { var v = f(); if (v) g(v); })(); }
function e() { var keep = h(); (function () { var other = f(); if (other) g(() => other); })(); x(keep); }
(function () { var v = f(); if (v) g(v); })(); x();
