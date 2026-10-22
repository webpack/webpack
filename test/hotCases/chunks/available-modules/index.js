export const direct = () => import(/* webpackChunkName: 'parent' */ './parent-a');
export const indirect = () => import(/* webpackChunkName: 'q' */ './q');

const next = () =>
	new Promise((resolve, reject) => {
		NEXT(require("../../update")(reject, true, resolve));
	});

if (!module.hot.data) it('hot updates late ancestor providers and restored factories', async () => {
	expect((await (await direct()).load()).value).toBe(42);
	await next();
	expect((await (await direct()).load()).value).toBe(42);
	await next();
	expect((await (await direct()).load()).value).toBe(42);
	await next();
	expect((await (await direct()).load()).value).toBe(43);
});
module.hot.accept();
