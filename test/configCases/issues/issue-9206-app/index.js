  // resolve from 'components/beta/index' is fine
  import b from 'components/beta';

	it("should compile without error", function() {
		expect(b).toBe("beta");
	});
