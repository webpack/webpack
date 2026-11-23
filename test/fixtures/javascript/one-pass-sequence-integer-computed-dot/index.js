function missing() {
	var value = (0, 42);
	return value["missingProperty"];
}
console.log(missing());
function called() {
	var value = (0, 42);
	return value["toFixed"](1);
}
console.log(called());
function dotted() {
	var value = (0, 42);
	return value.toString(2);
}
console.log(dotted());
function indexed() {
	var value = (0, 42);
	return value[0] + value["a b"];
}
console.log(indexed());
function seven() {
	var value = (0, 7);
	return value["toFixed"](2);
}
console.log(seven());
function text() {
	var value = (0, "s");
	return value["length"];
}
console.log(text());
