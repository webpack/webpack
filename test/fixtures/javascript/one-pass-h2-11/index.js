function f(a) {
	return [[`${a}<`, "/script>"].join(""), [`${a}<`, "!--"].join(""), [`${a}-`, "->"].join(""), [`${a}`, "b"].join("-")];
}
console.log(f(1));
