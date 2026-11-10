var foo = {},
	c = "k",
	a = 1,
	b = 2;
foo[(1, 2)] = 3;
var x = a ? (1, 2) : (3, b),
	y = foo[(1, c)],
	z = { [(1, 2)]: 3 };
export default (1, 2);
console.log(foo[2], x, y, z[2]);
