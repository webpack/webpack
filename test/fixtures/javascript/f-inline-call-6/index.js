function a() { var k = function () { if (p) q(); r(); }(); x(); }
function b() { let k = function () { let v = p(); if (v) r(v); }(); x(); }
function c() { var k = function () { if (p) q(); r(); }(); x(k); }
function d() { var j = 1, k = function () { if (p) q(); r(); }(); x(j); }
