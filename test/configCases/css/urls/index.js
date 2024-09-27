import sheet from './spacing.css' assert { type: 'css' }

const testCase = (tagName, impFn) => {
	it(`should be able to handle styles in ${tagName}.css`, done => {
		const element = document.createElement(tagName);
		document.body.appendChild(element);
		impFn().then(x => {
			try {
				expect(x).toEqual(nsObj({}));
				const style = getComputedStyle(element);
				expect(style).toMatchSnapshot();
				done();
			} catch (e) {
				done(e);
			}
		}, done);
	});
};

testCase("div", () => import("./spacing.css"));

it("sheet should resolve url", (done) => {
	const element = document.createElement("div");
	document.body.appendChild(element);
	document.adoptedStyleSheets = [sheet];
	const style = getComputedStyle(element);
	expect(style).toMatchSnapshot();
	done()
})