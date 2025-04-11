import React from 'react';

const foo = "module"

export default 'module'
export { React, foo }

it("should compile and run", () => {
	// avoid `No tests exported by test case`
	expect(true).toBe(true)
});
