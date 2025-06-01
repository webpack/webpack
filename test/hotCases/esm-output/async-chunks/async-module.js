export const message = "Hello from async module!";

if (module.hot) {
	module.hot.accept();
}
---
export const message = "Updated async module!";

if (module.hot) {
	module.hot.accept();
}
