
import foo from './foo.js';

function works1() {
  return foo.bar;
}

function works2() {
  const v = foo.bar;
  return v;
}

function works3() {
  const v = foo.bar.baz;
  return v;
}

it("should compile and run", () => {
  expect(works1()).toBe("test");
  expect(works2()).toBe("test");
  expect(works3()).toBe("test");
});
