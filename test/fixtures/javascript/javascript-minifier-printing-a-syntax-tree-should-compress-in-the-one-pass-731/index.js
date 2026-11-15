function a(...r) { return 1; }
function b(x, ...r) { return x; }
function c(...[x]) { return 1; }
function d(...r) { return r; }
function e(x, ...r) { return arguments; }
(function (...r) { g(); })(1, 2);
function f(/*! c */ ...r) { return 1; }
