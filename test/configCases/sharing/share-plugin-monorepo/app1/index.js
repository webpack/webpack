it('should provide library from own package.json', async () => {
  expect(await import('lib1')).toEqual(
    expect.objectContaining({
      default: 'lib1@1.1.1',
    }),
  );
});

it('should provide library from parent package.json', async () => {
  expect(await import('lib2')).toEqual(
    expect.objectContaining({
      default: 'lib2@2.2.2',
    }),
  );
});
