import './style.css' // doesn't has js output

it('should contain no js outupt', () => {
	// only has index.js
	expect(Reflect.ownKeys(__webpack_modules__).length).toBe(1)
})
