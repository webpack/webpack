function f(x, y) {
	return [+x + 1, "", +y + 2, "z"].join("") + [x + "a", -y].join("-") + ["q", y * 2].join("");
}
function g(x, y) {
	return [x, 1].join("") + [!(x || y)].join("") + [x + "a", 1].join("").length + [+x].join("");
}
function h(x, y) {
	return [1 / 0, "" + y].join("") + [x * 1, "" + y].join("") + [x + "a", '"'].join("") + [x < y, y].join("");
}
console.log(f(1, 2), g(3, 4), h(5, 6));
