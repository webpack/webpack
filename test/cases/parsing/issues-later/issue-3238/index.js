it("issue-3238: supports empty element in destructuring", function() {
  const second = ([, x]) => x;
  expect(second([1, 2])).toEqual(2);
});
