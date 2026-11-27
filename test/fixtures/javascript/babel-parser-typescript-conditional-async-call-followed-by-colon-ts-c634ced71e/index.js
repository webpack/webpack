// `async(x)` followed by `:` is only an arrow function if the type after `:`
// is followed by `=>`.
function* g() {
  a ? yield async(x) : y;
  a ? yield* async(x) : y;
  a ? b = yield async(x) : y;
}
async function f() {
  a ? await async(x) : y;
}
x ? () => async(x) : y;
switch (y) {
  case async(x): break;
}
