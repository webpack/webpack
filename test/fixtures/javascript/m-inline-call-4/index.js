function x() { y(); }
function y() { console.log(1); }
function z() { function y() { console.log(2); } x(); y(); }
z(); z();
var q = g();
function a() { b(); }
function b() { console.log(q); }
function c() { var q = 3; function b() { console.log(q); } a(); b(); b(); }
c(); c();
