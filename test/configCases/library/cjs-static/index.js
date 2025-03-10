const fs = require("fs")
export const foo1 = () => {}
export const foo2 = () => {}
const bar = "bar";
export default bar

it("should success compile and work",()=>{
	const output = fs.readFileSync(__filename).toString();
	expect(output.match(/exports(\[|\.)/g).length).toBe(4)
})
