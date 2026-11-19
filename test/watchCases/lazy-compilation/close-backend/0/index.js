it("should release the backend's port before the compiler closes", async () => {
	await CLOSE_BACKEND();
});
