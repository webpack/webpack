export default 1;

module.hot.dispose(data => {
	data.crash = true;
})
module.hot.accept(() => {
	expect(DEFINE_PATH).toBe("./a");
	module.hot.invalidate();
});
---
if (module.hot.data && module.hot.data.crash) throw new Error();
export default 2;
