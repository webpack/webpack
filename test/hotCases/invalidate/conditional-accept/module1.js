import data from "./data.json";
import { setValue1 } from "./store";

setValue1(data.a);

export default data.b;

if (module.hot.data && module.hot.data.ok && module.hot.data.b !== data.b) {
	module.hot.invalidate();
} else {
	module.hot.dispose(d => {
		d.ok = true;
		d.b = data.b;
	});
	module.hot.accept();
}
