console.log({ null: 1 }[null], { [null]: 2 }.null, { undefined: 3 }[void 0]);
console.log({ true: 4 }[true], { 1e3: 5 }[1000], { [void 0]: 6, b: 7 }.undefined);
(function () {
	var o = {};
	o[null] = 1;
	o.x = 2;
	console.log(o[null] + o.x);
})();
(function () {
	var o = { [void 0]: "u", n: "n" };
	console.log(o[void 0] + o.n);
})();
(function (undefined) {
	console.log({ undefined: 1, x: 2 }[undefined]);
})("x");
