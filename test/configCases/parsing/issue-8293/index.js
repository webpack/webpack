const fs = require("fs");
const path = require("path");

["import", "amd-require", "amd-define", "commonjs", "require.resolve"].forEach(
	method => {
		it(`should be able to replace ${method} param in DefinePlugin`, function() {
			const source = fs.readFileSync(
				path.join(__dirname, `bundle-${method}.js`),
				"utf-8"
			);
			expect(source).toContain(`\`./\${foobar}/suffix0`);
			expect(source).toContain(`\`./\${foobar}/suffix3`);
			expect(source).not.toContain(`\`./\${foobar}/suffix4`);
			expect(source).not.toContain(`\`./\${DEFINED_EXPRESSION}/\${CONST_SUFFIX4}`);
			expect(source).not.toContain(`typeof require ===`);
		});
	}
);

["import", "commonjs"].forEach(method => {
	it(`should be able to replace ${method} param in DefinePlugin for conditional expression`, function() {
		const source = fs.readFileSync(
			path.join(__dirname, `bundle-${method}.js`),
			"utf-8"
		);
		expect(source).toContain(`\`./\${"prefix1"}/\${foobar}/\${"suffix1"}`);
		expect(source).toContain(`\`./\${"prefix2"}/\${foobar}/\${"suffix2"}`);
	});
});

["amd-require", "amd-define", "require.resolve"].forEach(method => {
	it(`should be able to replace ${method} param in DefinePlugin for conditional expression`, function() {
		const source = fs.readFileSync(
			path.join(__dirname, `bundle-${method}.js`),
			"utf-8"
		);
		expect(source).toContain(`\`./\${foobar}/suffix1`);
		expect(source).toContain(`\`./\${foobar}/suffix2`);
	});
});
