function* g() {
	console.log("a");
	yield "b";
}
async function f() {
	console.log(await "c");
}
console.log([...g()].join(""));
f();
