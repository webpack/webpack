const MODE = "production";
const ENABLED = MODE === "foo" || MODE === "bar";
if (ENABLED) longFunction();
const name = "web";
log(name, `${name} page`);
let later = 1;
log(later + 1);
var some = 1;
log(some + 1);
f();
const early = 2;
function f() { return early + 1 }
