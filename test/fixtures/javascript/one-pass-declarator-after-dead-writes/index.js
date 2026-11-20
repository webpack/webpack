function before() {
	a = {};
	var a = [];
	return a;
}
function parameter(a) {
	var a = [1];
	return a;
}
function deadParameter(a) {
	a = {};
	var a = [2];
	return a;
}
function setAgain(a) {
	var a = {};
	a = [3];
	return a;
}
function mapped(a) {
	var a = [4];
	return [a, arguments[0]];
}
function later(a) {
	var set = function () {
		a = 5;
	};
	var a = [6];
	set();
	return a;
}
function effect(a) {
	var a = console.log("effect");
	return 7;
}
console.log(before(), parameter(), deadParameter(0), setAgain(0), mapped(0), later(0), effect(0));
