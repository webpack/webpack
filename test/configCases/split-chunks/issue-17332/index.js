it('should run', async () => {
	const { default: foo } = await import(/* webpackChunkName: "foo" */ "./foo");
	expect(foo).toBe('foo.js')
})
