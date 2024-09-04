it('should load module c', async () => {
	const m1 = await (await import('./module-b')).default
	const m2 = await import(/*webpackChunkName: 'module'*/ './module-a')

	expect(m1.default).toBe('module-c')
	expect(m2.default).toBe('module-a')
})
