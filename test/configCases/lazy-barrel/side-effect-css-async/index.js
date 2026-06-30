it("should emit the CSS of a used lazy re-export into the async chunk (#21306)", () =>
	import(/* webpackChunkName: "page" */ "./page").then(({ default: page }) => {
		expect(page()).toBe("used");
	}));
