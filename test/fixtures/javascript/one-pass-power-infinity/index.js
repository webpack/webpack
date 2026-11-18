var large = 2 ** 1024,
	negative = (-2) ** 1025,
	power = 2 ** (1 / 0);
var divided = large / 2 ** 1024;
var negated = -(2 ** 1024);
console.log(large, negative, power, divided, negated, [2 ** 1024]);
console.log(Math.random() < 2 ? 2 ** 1024 : 0, 3 ** -10);
