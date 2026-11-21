var held = 1;
function run(a, b) {
	a = (b, a + 4);
	var c = { value: 0 };
	c.value = (b, a * 2);
	var named = (b, function () {});
	var object = { value: (b, a - 1), list: [...(b, a > 9 ? [1] : [2])] };
	console.log(a, c, named.name, object.value, object.list, `${(b, a / 2)}`);
	return (held, a + 1);
}
console.log(run(1, 2), run(3, 4));
function missing(a) {
	try {
		a = (undeclared, a + 1);
	} catch (error) {
		console.log(error.name);
	}
	return a;
}
console.log(missing(1));
