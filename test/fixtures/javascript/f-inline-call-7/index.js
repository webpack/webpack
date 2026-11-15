function a(c) { if (c) { y(); return; } !function () { x(); if (b) d(); }(); }
function b2(c) { function t() { x(); if (b) d(); } if (c) { y(); return; } t(); }
function e(c) { function t() { x(); if (b) d(); } if (c) return; t(); }
function f(c) { if (c) { y(); return; } (function () { x(); if (b) d(); })(); }
