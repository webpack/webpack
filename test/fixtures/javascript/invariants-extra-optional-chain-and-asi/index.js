const source = { a: { b: [0, { c: 4 }] } };
const value = source?.a?.b?.[1]?.c ?? 0;

let fn = () => value
(function () {
  fn = () => value + 1;
})();

const maybeTag = null;
const out = maybeTag?.(`x${value}`);

export { fn, out, value };
