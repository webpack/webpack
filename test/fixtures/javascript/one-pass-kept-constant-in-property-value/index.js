const name = 1,
	foo = { name };
const flag = !0,
	bar = { a: flag };
var pattern;
({ a: pattern } = bar);
console.log(foo.name, bar.a, pattern);
