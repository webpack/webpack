export const direct = () => import(/* webpackChunkName: 'parent' */ './parent-a');
export const indirect = () => import(/* webpackChunkName: 'q' */ './q');

it('restores and removes inherited factories at step 0', async () => {
	expect((await (await direct()).load()).value).toBe(42);
});
