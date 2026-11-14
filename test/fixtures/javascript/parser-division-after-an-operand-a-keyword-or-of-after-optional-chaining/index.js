var o = { default: 8, of: 4, yield: 2 }, x = 2;
var b = o?.default / x / 1;
b = o?.of / x / 1;
function* g() {
	b = o?.yield / x / 1;
}
