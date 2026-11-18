const a = flag ? () => (x) : T => value;
const b = flag ? { id: (x: number): number => x } : null;
const c = flag ? [(x: number): number => x] : null;
const d = flag ? `${(x: number): number => x}` : null;
const e = flag ? ((x: number): number => x) : null;
const f = flag ? function () { return (x: number): number => x; } : null;
function make(): () => { value: number };
function make() { return () => ({ value: 1 }); }
let n = 3; const result = n < 2 >= 1;
const g = f<A<B>>(x);
const id = async <T extends unknown>(x: T) => x;
const call = async<number>(1);
module instanceof Object;
let defined!: boolean;
