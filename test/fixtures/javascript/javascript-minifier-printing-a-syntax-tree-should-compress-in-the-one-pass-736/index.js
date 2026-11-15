function a() { if (false) { var x = 1; } if (false) { var x = 2; } return x; }
function b() { var x = 2; if (false) { var x = 1; } return x; }
function c() { if (false) { var x = 1; } return x; var x; }
function d(x) { if (false) { var x = 1; } if (false) { var x; } return x; }
function e(y) { g(() => 1); if (y) { var z = 1; function k() {} } if (false) { var x = 1; } x = 2; return [x, z, k]; }
