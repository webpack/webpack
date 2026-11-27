// A literal is never nullish: a built-in read off one through `?.` folds as
// it does through `.`.
console.log((42)?.toString(), "ab"?.toUpperCase(), (255)?.toString(16));
console.log(`x`?.repeat(2), "ab"?.toUpperCase().length, (42)?.toString().x);
console.log([1]?.concat(2));
// `null` reads nothing, and an optional call keeps its call.
console.log(null?.toString(), "abc".slice?.(1));
