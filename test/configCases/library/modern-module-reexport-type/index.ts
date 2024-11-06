import { value, T } from './re-export'

export { value, T }

it("should not reexport type", function () {
	expect(value).toBe(1)
});
