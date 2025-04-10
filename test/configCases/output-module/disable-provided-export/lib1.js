import React from 'react';

const foo = true

export default 'disable-provided-export'

export { React, foo }

it("should compile and run", () => {
	// avoid `No tests exported by test case`
	expect(true).toBe(true)
});
