var i = 0;
(i++, null)?.unused;
(i++, null)?.a.b, (i++, void 0)?.(i++);
(i++, null)?.[i++].c?.(i++);
var kept = (i++, null)?.d;
(i++, {})?.e;
const obj = { key: 42 };
const val = obj.key?.toString();
console.log(i, kept, val);
