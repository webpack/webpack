it('should compile', async () => {
  await (await import(/* webpackChunkName: 'A' */ './A')).default
  await (await import(/* webpackChunkName: 'B' */ './B')).default
})
