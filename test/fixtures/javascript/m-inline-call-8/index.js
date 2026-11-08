function a() { (function f() { if (p) x(); y(); })(); z(); }
function b() { (function f() { if (p) f(); y(); })(); z(); }
function c() { var h = function f() { if (p) x(); y(); }; h(); z(); }
