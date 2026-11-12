function a(x) { switch (x) { case g(): } }
function b() { switch (g()) { case h(): case 1: default: } }
function c(x) { switch (x) { case g(): break; default: break; } }
function d(x) { switch (x) { case g(): case h(): } }
function e(x) { switch (x) { case 1: case h(): } }
function f(x) { switch (x) { case g(): case 2: h(); } }
function i(x, c) { if (c) switch (x) { case g(): } else h(); }
function j(x) { switch (x) { case (a(), b()): } }
function k(x) { switch (x) { case y = 1: } }
function l(x) { switch (x) { default: case g(): case 2: } }
switch (x) { case g(): }
function m(x) { switch (x) { /*! c */ case g(): } }
