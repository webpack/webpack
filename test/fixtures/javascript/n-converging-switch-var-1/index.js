var log = [];
function f(v) { log.push(v); return v; }
// A `var` setting nothing that every case falls into is declared after what runs.
switch (f(1)) { default: var b; }
switch (f(2)) { case 1: default: f(3); var c; f(4); }
// As a body it keeps its braces, or stays where nothing else runs.
if (log.length) switch (f(5)) { default: f(6); var d; }
if (log.length) switch (f(7)) { default: var e; }
console.log(log.join(), b, c, d, e);
