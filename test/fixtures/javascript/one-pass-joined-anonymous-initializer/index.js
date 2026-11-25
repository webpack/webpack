function first() {
	return 1;
}
function effect() {
	console.log("effect");
}
function run() {
	var a = first(),
		unused = effect(),
		live = function () {};
	return [a, a, live.name, live.name];
}
console.log(run().join(","));
function classRun() {
	var a = first(),
		unused = effect(),
		live = class {};
	return [a, a, live.name, live.name];
}
console.log(classRun().join(","));
function arrowRun() {
	var a = first(),
		unused = effect(),
		live = () => 1;
	return [a, a, live.name, live.name];
}
console.log(arrowRun().join(","));
