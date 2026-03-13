// Property access pattern
const inc = require("./increment").increment;
var a = 1;
inc(a); // 2

// Destructuring assignment pattern
const { add } = require("./math");
add(a, 2); // 3

// Aliased destructuring
const { increment: inc2 } = require("./increment");
inc2(a); // 2
