var a;
f(delete (a = 1));
x = delete (a = 2) + 1;
y = [delete (a, b)];
function g() { return delete (a = 3); }
// A reference, or a place that parenthesizes a sequence apart, keeps `delete`.
z = delete a.b;
w = (delete (a = 4)).c;
