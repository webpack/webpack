import a from './a';
export default 'b-default';

export function btest() {
	expect(a).toBe("a-default");
}
