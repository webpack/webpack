function quoted() {
	const o = { "__proto__": null };
	return [String(o.__proto__), String(o["__proto__"])];
}
function single() {
	const o = { '__proto__': null, x: 1 };
	return [String(o.__proto__), o.x];
}
function last() {
	const o = { "x": 2, "__proto__": null };
	return [o.x, String(o.__proto__)];
}
function computed() {
	const o = { ["__proto__"]: null };
	return String(o.__proto__);
}
function shorthand() {
	const __proto__ = 7;
	const o = { __proto__ };
	return o.__proto__;
}
console.log(JSON.stringify([quoted(), single(), last(), computed(), shorthand()]));
