// Folded: own elements of nested array literals and holes read as `undefined`.
console.log([[1, 2], [3, 4]][1][1] + 1);
console.log([1, , 3, 4][6 - 5] + 1);
console.log("ab"[5] * 2);
var x = function () {
	console.log("x");
	return 0;
};
// Must stay: an element that runs code, and a hole under a nested hole.
console.log([[1, x()], [3, 4]][1][1] + 1);
console.log([1, , x()][1] + 1);
console.log([[1, 2], , [3, 4]][1][1] + 1);
