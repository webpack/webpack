it("should handle indirect children with multiple parents correctly", function(done) {
  import('./pageB').then(b => {
    b.default.should.be.eql("reuse");
    done()
  }).catch(e => {
		done();
	})
})
