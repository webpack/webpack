import "./data.json";
import mod1 from "./module1";
import mod2 from "./module2";
import { value1, value2 } from "./store";

it("should invalidate a self-accepted module", function(done) {
	expect(mod1).toBe(1);
	expect(mod2).toBe(1);
	expect(value1).toBe(1);
	expect(value2).toBe(1);
	let step = 0;
	module.hot.accept("./module1");
	module.hot.accept("./module2");
	module.hot.accept("./data.json", () =>
		setTimeout(() => {
			switch (step) {
				case 0:
					step++;
					expect(mod1).toBe(1);
					expect(mod2).toBe(1);
					expect(value1).toBe(2);
					expect(value2).toBe(2);
					NEXT(require("../../update")(done));
					break;
				case 1:
					step++;
					expect(mod1).toBe(2);
					expect(mod2).toBe(2);
					expect(value1).toBe(2);
					expect(value2).toBe(2);
					NEXT(require("../../update")(done));
					break;
				case 2:
					step++;
					expect(mod1).toBe(3);
					expect(mod2).toBe(3);
					expect(value1).toBe(3);
					expect(value2).toBe(3);
					done();
					break;
				default:
					done(new Error("should not happen"));
					break;
			}
		}, 100)
	);
	NEXT(require("../../update")(done));
});
