it("should use default export", () => {
	return import('./main.mjs').then(res => {
		const { React, setVersion } = res.get();
		expect(typeof React).toBe('function');
		expect(setVersion).toBeTruthy();
	});
});
