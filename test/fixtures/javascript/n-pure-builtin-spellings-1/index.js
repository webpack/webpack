// `Object["keys"]` is the method `Object.keys` is; `Date.parse` reads a BigInt as a string.
Object["keys"]({});
Date.parse(10n);
x = Object["keys"]({ a: 1 });
// Computed by a name, or a BigInt read as a number, stays.
Object[k]({});
isNaN(10n);
