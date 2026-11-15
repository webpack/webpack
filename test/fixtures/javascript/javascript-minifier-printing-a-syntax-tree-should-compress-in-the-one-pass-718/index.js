function a(x) { switch (x) { case 1: y: break; g(); default: z: break; h(); } }
function b() { for (;;) { y: break; g(); } }
function c() { y: return 1; g(); }
function d(x) { switch (x) { case 1: p(); y: break; default: q(); } }
function e() { switch (1) { case 1: p(); y: break; q(); default: r(); } }
function k() { for (;;) { y: break y; g(); } }
function m() { y: { break y; g(); } h(); }
function n(x) { switch (x) { case 1: break; g(); default: break; h(); } }
function p(x) { switch (x) { case 1: q(); /*! c */ y: break; default: r(); } }
