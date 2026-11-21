function member(o) {
	const key = "x";
	({ [key]: o.result } = o);
	return o.result;
	key = 1;
}
function name(o) {
	const key = "x";
	let value = 0;
	({ [key]: value } = o);
	return value;
	key = 1;
}
function forOf(o) {
	const key = "x";
	for ({ [key]: o.result } of [o]);
	return o.result;
	key = 1;
}
function shorthand(o) {
	let a = 1;
	if (false) ({ a } = o);
	return a;
}
console.log(member({ x: 5 }), name({ x: 7 }), forOf({ x: 8 }), shorthand({ a: 2 }));
