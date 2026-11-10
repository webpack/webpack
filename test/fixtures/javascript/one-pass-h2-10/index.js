function f(x, y) {
	var a = [x + "a", -y].join("");
	a += [x + "b", -y].join("");
	var o = { k: [x + "c", -y].join("") };
	var g = () => [x + "d", -y].join("");
	var c = y ? [x + "e", -y].join("") : [x + "f", -y].join("");
	var l = y && [x + "g", -y].join("");
	var b = [x + "h", -y].join("") < y;
	var t = `${[x + "i", -y].join("")}!`;
	console.log(a, o.k, g(), c, l, b, t, [[x + "j", -y].join("")], new String([x + "k", -y].join("")) + "");
	return [x + "l", -y].join("") + [x + "m", -y].join("");
}
console.log(f(1, 2));
