class Base {}
function countArguments() {
	this.count = (() => arguments.length)();
}
class Derived extends Base {
	constructor() {
		(() => super())();
	}
}
function readThis() {
	return (() => this.value)();
}
function callResult() {
	return (() => this.method)()();
}
function directEval() {
	return (() => eval("var local"))();
}
function asyncArrow() {
	return (async () => arguments)();
}
function withParameter() {
	return ((arguments) => arguments)(1);
}
const object = {
	value: 1,
	method() {
		return this === object;
	}
};
console.log(
	new countArguments(1, 2).count,
	new Derived() instanceof Base,
	readThis.call(object),
	callResult.call(object),
	typeof directEval(),
	asyncArrow(1) instanceof Promise,
	withParameter()
);
