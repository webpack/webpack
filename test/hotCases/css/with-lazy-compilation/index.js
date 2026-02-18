const getFile = name =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, name),
		"utf-8"
	);

it("should work", async function (done) {
	let promise = import("./style.css");

	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			promise.then(res => {
				const links = window.document.getElementsByTagName("link");
				let href = links[0].href;
				expect(href).toBe("https://test.cases/path/style_css.css");
				href = href
					.replace(/^https:\/\/test\.cases\/path\//, "")
					.replace(/^https:\/\/example\.com\//, "");
				let sheet = getFile(href);
				expect(sheet).toContain("color: red;");

				module.hot.accept("./style.css", () => {
					const links = window.document.getElementsByTagName("link");
					let href = links[0].href;
					expect(href).toContain("https://test.cases/path/style_css.css?hmr");
					href = href
						.replace(/^https:\/\/test\.cases\/path\//, "")
						.replace(/^https:\/\/example\.com\//, "")
						.split("?")[0];
					let sheet = getFile(href);
					expect(sheet).toContain("color: blue;");
					done();
				});

				NEXT(require("../../update")(done));
			});
		})
	);
});
