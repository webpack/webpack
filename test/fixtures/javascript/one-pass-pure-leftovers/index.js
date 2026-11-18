// The branch an `if(x)y;else break` leaves runs nothing: the loop's body goes.
var seen = [];
var n = 0;
for (;;) if (n++ < 3) 1;
else break;
console.log(n);
// A branch that may throw or write stays.
n = 0;
for (;;) if (n++ < 2) seen.push(n);
else break;
console.log(seen.join());
// A loop leaving at once runs its start and its test; one running nothing goes.
for (async () => 1; ; ) break;
for (1; seen.push("test"); ) break;
if (n) for (1; ; ) break;
for (n = 5; seen.push("init"); ) break;
console.log(n, seen.join());
// A `concat` joining literals and `BigInt` of a BigInt run nothing unread.
[1].concat(2);
[1].concat([2], 3).concat(4);
BigInt(3n);
console.log([1].concat(2).length, typeof BigInt(3n));
// What the elements or arguments run stays.
[seen.push("element")].concat(2);
[1].concat([seen.push("argument")]);
[1].concat(seen);
console.log(seen.join());
