var log = [];
// A known `switch` a case holds may print as several statements, braced as an `if`'s body.
function g(a) { switch (a) { case 1: switch (1) { case 1: switch (a) { case 2: log.push("h"); } return; } } log.push("k"); }
// So may one printing as an `if` and the statements after it.
function h(a) { switch (a) { case 1: switch (a) { default: log.push("d"); case 2: return; } } log.push("e"); }
g(1); g(2); h(1); h(2);
console.log(log.join());
