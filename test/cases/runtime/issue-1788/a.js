import b from './b';
export default 'a-default';
export { btest } from "./b";

export function atest() {
	expect(b).toEqual("b-default");
}
