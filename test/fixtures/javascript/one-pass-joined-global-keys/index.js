// `o[NaN]`, `o[0/0]`, `o[undefined]` and `o[Infinity]` join the literal by name.
var o = {};
o[NaN] = 1;
o[0 / 0] = 2;
o[undefined] = 3;
o[Infinity] = 4;
o[1 / 0] = 5;
console.log(o[NaN], o.NaN, o[undefined], o[Infinity], Object.keys(o).join());
function local() {
	var p = {};
	p[0 / 0] = 1;
	p[undefined] = 2;
	return [p[NaN], p[void 0], Object.keys(p).join()].join();
}
console.log(local());
console.log(Object.keys({ [0 / 0]: 1, [2 / 4]: 2 }).join());
