function f(x) {
	return [[x + "$", "{oops}"].join(""), [x + "a", "{b}"].join("")];
}
console.log(f(1));
