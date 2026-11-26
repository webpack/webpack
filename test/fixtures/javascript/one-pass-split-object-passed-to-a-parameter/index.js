function observe(x){console.log(String(x))}
function run(){const o={n:7,r:/x/};observe(o.r);return (p=>p.n)(o)}
console.log(run());
function run2(){var o={n:7,r:/x/};observe(o.r);return (function(p){return p.n})(o)}
console.log(run2());
