import data from "./data.json";
import { setValue2 } from "./store";

setValue2(data.a);

export default data.b;

const b = data.b;

module.hot.accept(["./data.json"], () => {
	if (data.b !== b) {
		module.hot.invalidate();
		return;
	}
	setValue2(data.a);
});
