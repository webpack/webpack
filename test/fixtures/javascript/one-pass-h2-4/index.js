function f() { return {}; }
console.log(Object.keys({ __proto__: null, a: 1 }), Object.keys({ "__proto__": [], b: 2 }));
console.log(Object.keys({ __proto__: f(), c: 3 }), Object.keys({ ["__proto__"]: 1 }));
