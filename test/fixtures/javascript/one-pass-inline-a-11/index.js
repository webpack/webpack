let o = { __proto__: { b: 2 }, a: 1 };
console.log(o.a, o.b);
let p = { a: 1, get b() { return 2; } };
console.log(p.a, p.b);
