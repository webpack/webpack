// A built-in read off `globalThis` is the built-in: its unread call goes.
if (typeof globalThis === "object") {
	const finite = globalThis.isFinite(1234);
	const list = new globalThis.Array();
	const map = new globalThis.Map();
	const hyperbolic = globalThis.Math.acosh(1);
	const keyed = globalThis["Math"].abs(-1);
	// What is no built-in, or one the program replaces, still runs.
	const replaced = globalThis.Math.sign;
	globalThis.Math.sign = function (value) {
		console.log("sign", value);
		return 1;
	};
	const signed = globalThis.Math.sign(2);
	globalThis.Math.sign = replaced;
	console.log(typeof globalThis.isNaN, Math.sign(-3));
}
console.log("done");
// A global the script declares or sets is its own, not the built-in.
var escape = function (value) {
	console.log("escape", value);
	return value;
};
unescape = function (value) {
	console.log("unescape", value);
	return value;
};
if (typeof globalThis === "object") {
	const escaped = globalThis.escape(1);
	const unescaped = globalThis.unescape(2);
}
