export const load0 = () => import(/* webpackChunkName: 'g0' */ './a0.js');
export const load1 = () => import(/* webpackChunkName: 'g1' */ './a1.js');

it('settles availability when a late parent closes a cycle', async () => {
	const direct = await load0();
	expect(direct.values).toEqual([3]);
	expect((await direct.load0()).values).toEqual([3]);
	const a1 = await load1();
	const a2 = await a1.load1();
	const again = await a2.load0();
	expect(typeof again.load1).toBe('function');
	expect(typeof (await again.load1()).load0).toBe('function');
});
