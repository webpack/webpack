import { __webpack_require__ as namedUse } from './runtime-export-named'
import defaultUse from './runtime-export-default'
import { __webpack_require__ as namedDeclUse } from './runtime-export-decl'
import { __webpack_require__ as objectRequire, __webpack_exports__ as objectExport } from './runtime-single-require-and-export'

it("should compile and run", () => {
	expect(namedUse()).toBe(42);
	expect(defaultUse()).toBe(42);
	expect(namedDeclUse()).toBe(42);
	expect(objectRequire.foo).toBe(42);
	expect(objectExport.foo).toBe(42);

	const path = __non_webpack_require__('path')
	const fs = __non_webpack_require__('fs')
	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle0.js'), 'utf-8');
		const NESTED_RE = /__nested_webpack_require_([^_]+)__/g;
		expect(content.match(NESTED_RE).length).toBe(11);
	}

	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle0.js'), 'utf-8');
		const NESTED_RE = /__[n]ested_webpack_exports__/g;
		expect(content.match(NESTED_RE).length).toBe(2);
	}

	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle1.js'), 'utf-8');
		const NESTED_RE = /__nested_webpack_require_([^_]+)__/g;
		expect(content.match(NESTED_RE).length).toBe(11);
	}

	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle1.js'), 'utf-8');
		const NESTED_RE = /__[n]ested_webpack_exports__/g;
		expect(content.match(NESTED_RE).length).toBe(2);
	}

	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle2.js'), 'utf-8');
		const NESTED_RE = /__nested_webpack_require_([^_]+)__/g;
		expect(content.match(NESTED_RE).length).toBe(11);
	}

	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle2.js'), 'utf-8');
		const NESTED_RE = /__[n]ested_webpack_exports__/g;
		expect(content.match(NESTED_RE).length).toBe(2);
	}

	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle3.js'), 'utf-8');
		const NESTED_RE = /__nested_webpack_require_([^_]+)__/g;
		expect(content.match(NESTED_RE).length).toBe(11);
	}

	{
		const content = fs.readFileSync(path.resolve(__dirname, './bundle3.js'), 'utf-8');
		const NESTED_RE = /__[n]ested_webpack_exports__/g;
		expect(content.match(NESTED_RE).length).toBe(2);
	}
});
