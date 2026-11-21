var log = [];
function effect(name) {
	log.push(name);
	return 2;
}
function or(a) {
	var b = effect("or");
	a ||= b;
	return a;
}
function and(a) {
	var b = effect("and");
	a &&= b;
	return a;
}
function nullish(a) {
	var b = effect("nullish");
	a ??= b;
	return a;
}
function pure(a) {
	var b = 3;
	a ||= b;
	return a;
}
console.log(or(1), or(0), and(1), and(0), nullish(1), nullish(null));
console.log(pure(0), pure(1), log.join(","));
