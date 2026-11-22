function merge() {
	const defaults = { b: 2, c: 3 };
	return { a: 1, ...this, ...defaults };
}
console.log(JSON.stringify(merge.call({ a: 0, d: 4 })));
function empty() {
	const none = {};
	return { ...this, ...none };
}
console.log(JSON.stringify(empty.call({ e: 5 })));
function accessor() {
	const got = {
		get f() {
			console.log("getter");
			return 6;
		}
	};
	return { ...got };
}
console.log(JSON.stringify(accessor()));
function prototype() {
	const proto = { __proto__: { g: 7 }, h: 8 };
	return { ...proto };
}
console.log(prototype().g, prototype().h);
