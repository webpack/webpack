it("should import a single process.env var", function() {
  process.env.AAA.should.be.eql("aaa");
});

it("should import multiple process.env vars", function() {
  process.env.BBB.should.be.eql("bbb");
  process.env.CCC.should.be.eql("123");
});

it("should warn when a process.env variable is undefined", function() {
  (process.env.DDD === undefined).should.be.true;
});
