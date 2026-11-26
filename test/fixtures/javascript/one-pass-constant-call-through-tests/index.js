// A call of a function whose constant tests surely reach a returned literal prints it.
var seen = [];
function f(v) {
	seen.push(v);
	return v;
}
function viaSwitch() {
	const get = () => {
		switch ("apple") {
			case "apple":
				return "1";
			case "banana":
				return "2";
		}
		return "3";
	};
	return get();
}
function viaDefault() {
	const get = () => {
		switch ("x") {
			case "a":
				return "a";
			default:
				return "d";
		}
	};
	return get();
}
function viaBreak() {
	const get = () => {
		switch ("a") {
			case "a":
				break;
		}
		return "after";
	};
	return get();
}
function viaIfs(env) {
	const key = "staging";
	const get = () => {
		if (key === "production") return "production";
		else if (key === "staging") return "staging";
		throw new Error(env);
	};
	return get();
}
function runs() {
	const get = () => {
		switch ("a") {
			case "a":
				f("ran");
				return "1";
		}
		return "3";
	};
	return get();
}
function unknown(x) {
	const get = () => {
		switch (x) {
			case "a":
				return "1";
		}
		return "3";
	};
	return get();
}
function tested() {
	const get = () => {
		if (f(0)) return "0";
		return "1";
	};
	return get();
}
console.log(viaSwitch(), viaDefault(), viaBreak(), viaIfs("e"), runs(), unknown("a"), unknown("b"), tested(), seen);
