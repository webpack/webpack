module.exports = new Promise((resolve) => {
	// The `import()` sits inside the `require.ensure` block, so only a walk of
	// nested blocks reaches it.
	require.ensure([], () => {
		resolve(import("./other"));
	});
});
