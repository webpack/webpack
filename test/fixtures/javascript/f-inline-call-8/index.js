export function a() { (function () { if (p) q(); return r(), s; })(); x(); }
export function b() { (function () { if (p) q(); return; })(); x(); }
export function c() { return function () { if (p) q(); return r(); }(); }
export function d() { var k = function () { if (p) q(); return r(); }(); x(); }
(function () { var v = f(); if (v) g(v); })(); x();
