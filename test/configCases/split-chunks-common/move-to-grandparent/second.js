it("should handle indirect children with multiple parents correctly", function(done) {
  import('./pageB').then(b => {
    expect(b.default).toBe("reuse");
    done()
  }).catch(e => {
		done();
	})
})
