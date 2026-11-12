x = { a: { b: 1 }, b: function () {} }.a;
y = [{ b: 1 }][0];
z = { a: { b: g() } }.a;
w = `${{ a: { b: 1 } }.a}`;
({ a: { b: 1 } }).a;
f = () => ({ a: { b: 1 } }).a;
v = { a: { b() { return this; } } }.a.b();
delete { a: { b: 1 } }.a;
[{ b: g() }][0].c;
