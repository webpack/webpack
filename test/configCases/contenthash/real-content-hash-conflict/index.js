it("should have correct value from async chunk", async () => {
	const { default: value } = await import(/* webpackChunkName: "async" */ "./async");
	expect(value).toBe(42);
})

it("should not replace user content when real content hash has a hashPrefix", () => {
	const userContent = __USER_CONTENT__;
	const encodedUserContent = __BASE64_USER_CONTENT__;
	const decodedUserContent = Buffer.from(encodedUserContent, "base64").toString("utf-8");
	if (PREFEXED) {
		expect(userContent).toBe(decodedUserContent);
	} else {
		expect(userContent).not.toBe(decodedUserContent);
	}
});
