function f() { let t; return delete (t = o.f); }
function g() { let t; return (delete (t = o.f)).x; }
function h() { let t; return delete (t = 1); }
function k() { let t; return [delete (t = o.f), t]; }
