const store = { value: 1, error: false };
export default () => store.value;
export const getError = () => store.error;
export const id = module.id;
import.meta.webpackHot.dispose(data => {
	data.store = store;
})
import.meta.webpackHot.accept(function errorHandler(err, { module, moduleId }) {
	import.meta.webpackHot.data.store.error = true;
	module.hot.accept(errorHandler);
	module.hot.dispose(data => {
		data.store = store;
	})
});
---
import.meta.webpackHot.data.store.error = false;
import.meta.webpackHot.data.store.value = 2;
export default () => { throw new Error("should not happen") };
export const getError = () => { throw new Error("should not happen") };
export const id = module.id;
throw new Error("Failed");
---
)))
---
import.meta.webpackHot.data.store.error = false;
import.meta.webpackHot.data.store.value = 4;
export default () => { throw new Error("should not happen") };
export const getError = () => { throw new Error("should not happen") };
export const id = module.id;
