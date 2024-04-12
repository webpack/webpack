it("should have correct local ident for css export locals", (done) => {
	Promise.all([
		import("./style.module.css"),
		import("./style.module.css?hash"),
		import("./style.module.css?hash-local"),
		import("./style.module.css?path-name-local"),
		import("./style.module.css?file-local"),
		import("./style.module.css?q#f"),
		import("./style.module.css?uniqueName-id-contenthash"),
		import("./style.module.less"),
	]).then(([idLocal, hash, hashLocal, pathNameLocal, fileLocal, queryFragment, uniqueNameIdContenthash, less]) => {
		expect(idLocal).toMatchSnapshot();
		expect(hash).toMatchSnapshot();
		expect(hashLocal).toMatchSnapshot();
		expect(pathNameLocal).toMatchSnapshot();
		expect(fileLocal).toMatchSnapshot();
		expect(queryFragment).toMatchSnapshot();
		expect(uniqueNameIdContenthash).toMatchSnapshot();
		expect(less).toMatchSnapshot();
		done()
	}).catch(done)
});
