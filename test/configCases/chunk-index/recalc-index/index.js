it('should compile', async () => {
	await import(/* webpackChunkName: 'dynamic' */ './dynamic')
})
