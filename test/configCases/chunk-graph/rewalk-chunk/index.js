it('should load module c', async () => {
	const m1 = await (await import('./module-b')).default
	const m2 = await import(/*webpackChunkName: 'module'*/ './module-a')

	expect(m1.default).toBe('module-c')
	expect(m2.default).toBe('module-a')
})

it('should load late from the chunks below the late-grown named chunk', async () => {
	const moduleA = await import(/*webpackChunkName: 'module'*/ './module-a')

	const inherits = await moduleA.loadInherits()
	expect(inherits.default()).toBe('late')
	const cycle = await inherits.loadCycle()
	expect(cycle.default()).toBe('late-dep')
	expect((await cycle.loadBack()).default()).toBe('late')
	expect((await moduleA.loadKeeps()).default()).toBe('late')
})

it('should load late from a chunk reached without the named chunk', async () => {
	const keeps = await import(/* webpackChunkName: 'keeps-late' */ './keeps-late')

	expect(keeps.default()).toBe('late')
})
