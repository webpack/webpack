const trap = new Proxy({}, { has(target, key) { console.log("trap", key); return true; } });
"x" in { __proto__: trap };
"y" in { "__proto__": trap };
let handed = { a: 1 };
Object.setPrototypeOf(handed, trap);
"z" in handed;
let passed = { a: 1 };
function give(p) { Reflect.setPrototypeOf(p, trap); }
give(passed);
"w" in passed;
