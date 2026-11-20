// A `var` declarator setting nothing goes where the same list sets the name later.
function again(x) {
	var a,
		b = x,
		a = b + 1;
	return [a, b];
}
function head(x) {
	for (var i, i = 0; i < x; i++) console.log(i);
}
function kept(x) {
	var a, a;
	console.log(a, x);
}
console.log(again(1), again(2));
kept(3);
kept(4);
head(2);
head(1);
