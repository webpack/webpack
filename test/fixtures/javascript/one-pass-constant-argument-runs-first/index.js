var count = 0;
function bump() {
	count++;
	return count;
}
function show(x) {
	console.log(x, count);
}
var passed = (bump(), 5);
show(passed);
function twice(x) {
	return x * 2;
}
var inner = (bump(), 6);
console.log(twice(inner), count);
