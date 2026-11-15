var n = 0;
function inc(s) { n++; return s; }
(inc(`,`), !n) ? console.log("a", n) : console.log("b", n);
(inc(/,/), !n) ? console.log("c", n) : console.log("d", n);
(inc(), n) ? console.log("e", n) : console.log("f", n);
