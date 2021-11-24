import { url } from './module';

it("should not transform import.meta", function () {
	expect(url).toEqual(import.meta.url);
});
