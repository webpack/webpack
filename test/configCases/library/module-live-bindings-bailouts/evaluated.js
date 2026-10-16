export let evaluated = 1;
export function readEvaluated() {
	// eslint-disable-next-line no-eval
	return eval("evaluated");
}
export function setEvaluated(value) {
	evaluated = value;
}
