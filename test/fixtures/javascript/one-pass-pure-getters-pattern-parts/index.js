function take({ used, unused, fallback = console.log("default") }) {
	console.log(used);
}
take({ used: 1, unused: 2 });
function pick(object) {
	let { a, b } = object;
	console.log(b);
	const { c, ...rest } = object;
	console.log(rest);
	var { d: { e } = {} } = object;
}
pick({ a: 1, b: 2, c: 3, d: { e: 4 } });
try {
	let { f } = null;
} catch (e) {
	console.log("throws");
}
