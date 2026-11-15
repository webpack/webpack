// An eval() call before the declarations finds them uninitialized
// eslint-disable-next-line no-eval
eval("0");
export let evaluated = 1;
// Written through eval() alone
export let onlyEvaluated = 1;
export function readEvaluated() {
	// eslint-disable-next-line no-eval
	return eval("evaluated");
}
export function setEvaluated(value) {
	evaluated = value;
}
export function setByEval(value) {
	// eslint-disable-next-line no-eval
	eval("evaluated = value; onlyEvaluated = value");
}
export function makeLateWriter() {
	// eslint-disable-next-line no-eval
	return eval("(value) => { evaluated = value; }");
}
