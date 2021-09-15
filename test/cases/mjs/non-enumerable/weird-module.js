const sym = Symbol("sym");
exports.sym = sym;
exports.prop = true;
Object.defineProperty(exports, "nonEnumerable", { value: true });
exports[sym] = true;
const p = { protoProp: true, [sym]: true };
Object.setPrototypeOf(exports, p);
Object.defineProperty(p, "nonEnumerablePrototype", { value: true });
