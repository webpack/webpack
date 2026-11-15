function a() { function f() { h(); } function g() { f(); } function h() { g(); } x(); }
function b() { function f() { h(); } function h() { f(); } x(); }
function c() { function f() { h(); } function h() { k(); } function k() { z(); } f(); }
