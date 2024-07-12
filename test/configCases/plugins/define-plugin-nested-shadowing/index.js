import foo from './foo.js';

function getFooBar1() {
  return foo.bar;
}

function getFooBar2() {
  const bar = foo.bar;
  return bar;
}

it.failing("should reference imported module", function() {
  expect(getFooBar1).not.toThrow();
  expect(getFooBar1()).toBe(12345);
  expect(getFooBar2).not.toThrow();
  expect(getFooBar2()).toBe(12345);
});
