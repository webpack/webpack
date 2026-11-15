Object.defineProperty(Array.prototype, Symbol.iterator, { value: g });
function a() { const [{ x: unused, y: used }] = [{ x: 0, y: 1 }]; return used; }
function b() { const [unused, used] = [1, 2]; return used; }
