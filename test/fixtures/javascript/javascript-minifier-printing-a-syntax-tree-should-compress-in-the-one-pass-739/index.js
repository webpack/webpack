console.log(String(a), String(a + b), String(a - b), String(a * b), String(a || b), String(a ? b : c), String(a, b), String(...a), String());
x = String(a).length + String(a) + typeof String(a);
y = `${String(a)}` + (1 - String(a)) + (String(!(a == b)) == b) + String(a) ** 2;
z = c ? String(a) : String(b);
