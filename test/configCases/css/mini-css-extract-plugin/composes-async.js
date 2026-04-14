it("should work css modules and composes", async () => {
	const styles = await import(/* webpackChunkName: "composes-async-1" */ "./composes-async-1.modules.css");
	const styles1 = await import(/* webpackChunkName: "composes-async-2" */ "./composes-async-2.modules.css");

	expect(styles).toMatchSnapshot();
	expect(styles1).toMatchSnapshot();

	const links = [...document.getElementsByTagName("link")];

	expect(links.filter((item) => /composes-async/.test(item.href)).map((item) => item.sheet.css)).toMatchSnapshot();
});

