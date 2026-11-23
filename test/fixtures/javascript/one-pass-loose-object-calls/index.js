// Calls of functions returning only objects or nothing compare loosely as
// strictly; one returning `null` or a primitive keeps `===`.
function named() {}
function returnsName() {
	return named;
}
console.log(returnsName() === returnsName());
function returnsFresh() {
	return function () {};
}
console.log(returnsFresh() !== returnsFresh());
var flag = 0;
function maybe() {
	if (flag) return [];
}
console.log(maybe() === maybe());
function returnsNull() {
	return null;
}
console.log(returnsNull() === maybe(), maybe() === returnsNull());
function returnsNumber() {
	return 1;
}
console.log(returnsNumber() === returnsFresh());
