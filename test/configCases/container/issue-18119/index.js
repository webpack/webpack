it("should allow promise remotes to reference __webpack_require__.l", async () => {
	const remote = await import("remote/test");
	expect(remote.default).toBe("./test");
});
