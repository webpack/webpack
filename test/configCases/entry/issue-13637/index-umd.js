// This test verifies that the System.register context is not available for non-system entries

it("should not be able to use the System.register context in entries where library.type is not system", function() {
  expect(__system_context__).toBeUndefined();
});
