var n = 0;
function inc(s) { n++; return s; }
function m() { return n - 1; }
(inc(","), !(n = m())) ? console.log("a", n) : console.log("b", n);
(inc("(\")"), !n) ? console.log("c", n) : console.log("d", n);
