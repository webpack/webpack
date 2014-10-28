it("should compile and run the test", function (done) {
  require(['./chunk'], function () {
    it("should load additional chunks", function () {});
    done();
  });
});
