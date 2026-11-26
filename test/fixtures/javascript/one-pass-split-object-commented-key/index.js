function observe(x){console.log(String(x))}
function run(){const o={n:7,r:/x/};observe(o[/*! @license example */ "r"]);return o.n}
console.log(run());
