function show(value) {
	return value.name;
}
function assigned() {
	var made;
	made = function () {};
	return show(made);
}
function inPlace(made) {
	return (made = function () {}).name;
}
function chained() {
	var inner;
	outer = inner = function () {};
	return outer.name;
}
function calledAssigned() {
	var made;
	made = function () {
		return "called";
	};
	return made();
}
var outer;
console.log(assigned(), inPlace(), chained(), calledAssigned());
