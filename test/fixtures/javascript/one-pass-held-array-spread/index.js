var values = [2, 3];
console.log.apply(console, [1, ...values, 4]);
var passed = [5, 6];
console.log(0, ...passed);
var none = [];
console.log(...none, "none");
var holes = [2, , 3];
console.log([1, ...holes, 4].length, 1 in [0, ...holes]);
var nested = [[1], [2, [3]]];
console.log(...nested);
var brackets = ["]", /]/.source];
console.log([0, ...brackets]);
function Pair(a, b) {
	this.sum = a + b;
}
var built = [5, 6];
console.log(new Pair(...built).sum);
var object = { a: 1 };
console.log({ ...object });
var copied = [7, 8];
var copy = [...copied];
console.log(copy);
