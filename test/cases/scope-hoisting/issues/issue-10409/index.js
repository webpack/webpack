it("issue-10409: should import these modules correctly", () => {
	return import("./main");
});

if (Math.random() < 0) import("./b");
