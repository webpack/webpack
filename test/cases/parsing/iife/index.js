import { a } from './a';
import { track1, track2 } from './side-effect-call';

it("should parse params", () => {
	expect(a).toBe(1000);
	track1();
	expect(a).toBe(100);
	track2();
	expect(a).toBe(10);
});
