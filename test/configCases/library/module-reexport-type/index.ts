import { value, T } from './re-export'
import { NamedT } from './re-export-named'
import logo from './file.png';

type MyType = string;

export { logo, value, T, NamedT, MyType }

it("should not reexport type", function () {
	expect(value).toBe(1)
});

type OtherMyType = string;

export type { OtherMyType }
export default MyType;
