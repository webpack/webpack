for (var x of ([1, 2], [3, 4])) f(x);
for (let y in (1, o)) f(y);
({}, []).foo = 2;
({}, a).b();
// An object or a chain read a member of keeps its parentheses.
(1, {}).b = 2;
z = (0, a?.b).c;
