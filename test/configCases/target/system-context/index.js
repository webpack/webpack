// This test verifies that the System.register context is made available to webpack bundles

it("should be able to use the System.register context", function() {
  expect(__system_context__).toBeTruthy();
  expect(__system_context__.meta).toBeTruthy();
  expect(typeof __system_context__.import).toBe("function");
  expect(typeof __system_context__.meta.url).toBe("string");
});
