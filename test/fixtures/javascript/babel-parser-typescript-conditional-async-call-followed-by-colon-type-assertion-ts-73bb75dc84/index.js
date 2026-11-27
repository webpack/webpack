// `async(x)` followed by `:` is only an arrow function if the type after `:`
// is followed by `=>`.
a ? <T>async(x) : y;
