function moved() {
	return x;
}
function keep() {
	return x;
}
function read() {
	return y;
}
var x = 2,
	y = 3;
console.log(moved(), keep(), read());
function twice() {
	return x * 2;
}
console.log(twice(), twice());
function written() {
	return 1;
}
written = function () {
	return 5;
};
console.log(written());
