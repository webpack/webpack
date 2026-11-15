exports.a = class {
	value = sideEffect();
	static #secret = 1;
	method() {
		return sideEffect();
	}
};

function sideEffect() {
	throw new Error("never called");
}
