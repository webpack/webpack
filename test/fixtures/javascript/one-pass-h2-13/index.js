function f(a) {
	return [[a + "\0", "1"].join(""), [a + "\0", "x"].join("")];
}
console.log(JSON.stringify(f(1)));
