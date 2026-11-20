// A setter on the global object sees each write of `slot`.
var slot = 1;
slot = 2;
var unset;
unset = 3;
function local() {
	var value = 1;
	value = 4;
	return value;
}
console.log(slot, unset, local());
