it("should render the missing re-export once the barrel has side effects", () =>
	import("./pkg").then(
		() => {
			throw new Error("the barrel should not evaluate");
		},
		(error) => {
			expect(error.message).toMatch(/Cannot find module '\.\/missing'/);
		}
	));
