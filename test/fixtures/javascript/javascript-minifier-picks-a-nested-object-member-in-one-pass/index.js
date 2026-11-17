g({ a: { b: 2 } }.a.b);
g({ a: [1, 2] }.a[1], [{ b: 2 }][0].b, { a: { b: { c: 3 } } }.a.b.c);
g({ a: [1] }.a.length, { a: "ab" }.a.length);
