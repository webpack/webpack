import a from './a';
export default 'b-default';

export function btest() {
	expect(a).toEqual("a-default");
}
