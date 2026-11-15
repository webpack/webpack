const a = 1;
function f(x) {
	return [`${1}`, `${"b"}`, `${a}`, `${x}`];
}
console.log(f(2).join());
