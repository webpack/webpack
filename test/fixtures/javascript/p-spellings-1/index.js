var x = 3;
var epsilon = Number.EPSILON,
	max = Number.MAX_SAFE_INTEGER,
	min = Number.MIN_SAFE_INTEGER,
	tiny = Number.MIN_VALUE;
console.log(epsilon, max, min, tiny, x - Number.MAX_SAFE_INTEGER, x * Number.EPSILON);
console.log(-Number.EPSILON, Number.EPSILON.toFixed(2), x < Number.MAX_SAFE_INTEGER);
