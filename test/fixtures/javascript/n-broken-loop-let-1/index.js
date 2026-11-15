var log = [];
function f(v) { log.push(v); return v; }
const a = 9;
// A loop leaving at once sets the names it scopes for none to read.
for (const a = 1; a < 3; f(0)) break;
if (log.length) for (let b = 1; ; ) break;
else f(1);
// A value running something runs, the names kept in braces.
for (let c = f(2); ; ) break;
console.log(log.join(), a);
