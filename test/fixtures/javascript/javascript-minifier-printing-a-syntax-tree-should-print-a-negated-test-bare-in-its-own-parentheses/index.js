function link(array) {
	if (!(n = array.length)) return;
	var n,
		i = 0,
		a = array[0],
		b;
	while (++i < n) {
		a.n = b = array[i];
		b.p = a;
		a = b;
	}
	a.n = b = array[0];
	b.p = a;
}
function first(a) {
	if (!(a ? a.b : c)) return;
	g();
	h();
}
for (;;) {
	if (!((a = b), c)) break;
	g();
}
if (!(d = e));
else h();
link(x);
first(y);
let value, done;
while (({ value, done } = it.next())) {
	if (done) break;
	g(value);
}
for (;;) {
	if (!({ value } = it.next())) break;
	g(value);
}
function last() {
	if (({ value, done } = it.next())) return;
	if (done) g(value);
}
x = !({ value } = it.next());
last();
