function a(v) { switch (v) { case E: { try { w(); } finally { c(); } break; } } }
function b(v) { switch (v) { case E: { if (v) { g(); } break; } } }
switch (1 + /*! keep */ 2) { case probe(): break; }
function c(v) { switch (v) { case E: { try { w(); } finally { c(); } (() => { let unused = 1; })(); break; } } }
function d(v, t) { if (t) { switch (v) { case E: { g(); h(); break; } } } else k(); }
