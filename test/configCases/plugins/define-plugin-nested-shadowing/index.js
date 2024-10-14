import foo from './foo.js';

function getFooBar1() {
  return foo.bar;
}

function getFooBar2() {
  const bar = foo.bar;
  return bar;
}

it("should reference imported module (simple)", () => {
  expect(getFooBar1).not.toThrow();
  expect(getFooBar1()).toBe(12345);
});

// it.failing was introduced in Jest 28
if (it.failing) {
  it.failing("should reference imported module (assignment)", () => {
    expect(getFooBar2).not.toThrow();
    expect(getFooBar2()).toBe(12345);
  });
}
