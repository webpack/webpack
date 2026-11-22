function kind(value) {
	return typeof value;
}
console.log(kind(void 0));
function unsetKind() {
	var unset = void 0;
	return typeof unset;
}
function calledKind() {
	var called = (function () {})();
	return typeof called;
}
function effect() {
	console.log("effect");
}
function voidedKind() {
	var voided = void effect();
	return typeof voided;
}
console.log(unsetKind(), calledKind(), voidedKind());
