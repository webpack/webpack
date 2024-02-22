it("should have correct local ident for css export locals", (done) => {
	Promise.all([
		import("./style.module.css"),
		import("./style.module.css?hash"),
		import("./style.module.css?hash-local"),
		import("./style.module.css?path-name-local"),
		import("./style.module.css?file-local"),
	]).then(([idLocal, hash, hashLocal, pathNameLocal, fileLocal]) => {
		expect(idLocal).toMatchSnapshot();
		expect(hash).toMatchSnapshot();
		expect(hashLocal).toMatchSnapshot();
		expect(pathNameLocal).toMatchSnapshot();
		expect(fileLocal).toMatchSnapshot();
		done()
	}).catch(done)
});
