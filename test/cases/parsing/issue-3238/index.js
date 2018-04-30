it("supports empty element in destructuring", function() {
  const second = ([, x]) => x;
  second([1, 2]).should.eql(2);
});
