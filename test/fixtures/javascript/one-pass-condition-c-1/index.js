var n = 0;
function inc() { n++; }
function test() { return n > 1; }
(inc(), !test()) ? console.log("a", n) : console.log("b", n);
(inc(), !test()) ? console.log("a", n) : console.log("b", n);
(inc(), ! --n) ? console.log("c", n) : console.log("d", n);
var k = 0;
(inc(), !(n || k)) ? console.log("e", n) : console.log("f", n);
