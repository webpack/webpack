it('should provide own dependency', async () => {
  expect(await import('lib')).toEqual(
    expect.objectContaining({
      default: 'lib@1.1.1 with transitive_lib@1.1.1',
    }),
  );
});
