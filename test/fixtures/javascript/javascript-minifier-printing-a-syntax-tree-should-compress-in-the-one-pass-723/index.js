function a() { ~function () {}(b); }
function c() { -function () {}(b, d()); }
function e() { +function () {}([g()]); }
function h() { ~void g(); }
function i() { !function () {}(b); }
function j() { ~function () {}(1); }
function k() { ~function () {}(b), d(); }
function l() { ~function () { g(); }(); }
function m() { ~function () {}(...b); }
function n() { ~g(); }
function o() { x = ~function () {}(b); }
