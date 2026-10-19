import "./a.css";

const readStyles = () =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, "main.css"),
		"utf-8"
	);

it("should apply a hot update to the extracted stylesheet", function (done) {
	expect(readStyles()).toContain("color: red;");

	// mini-css-extract-plugin reports the reload on the console: check it there
	// rather than let it reach the test output
	const log = console.log;
	const logs = [];
	console.log = (...args) => {
		logs.push(args.join(" "));
	};
	const finish = (err) => {
		console.log = log;
		done(err);
	};

	NEXT(
		require("../../update")(finish, true, () => {
			expect(readStyles()).toContain("color: blue;");
			// the plugin debounces the reload by 50ms
			setTimeout(() => {
				try {
					expect(logs.join("\n")).toContain("Reload all css");
				} catch (err) {
					return finish(err);
				}
				finish();
			}, 100);
		})
	);
});

module.hot.accept();
