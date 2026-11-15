it("should reject import() when a chunk fails to evaluate", async () => {
	await expect(
		import(/* webpackChunkName: "broken" */ "./chunk")
	).rejects.toThrow(SyntaxError);
});

it("should read a chunk again after it failed to load", async () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	fs.writeFileSync(
		path.join(__dirname, "broken.js"),
		'throw new Error("read again");'
	);
	await expect(
		import(/* webpackChunkName: "broken" */ "./chunk")
	).rejects.toThrow("read again");
});
