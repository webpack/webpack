import(/* webpackChunkName: "async" */ "./async");

it("should compile", () => {
	const userContent = __USER_CONTENT__;
	const encodedUserContent = __BASE64_USER_CONTENT__;
	const decodedUserContent = Buffer.from(encodedUserContent, "base64").toString("utf-8");
	if (PREFEXED) {
		expect(userContent).toBe(decodedUserContent);
	} else {
		expect(userContent).not.toBe(decodedUserContent);
	}
});
