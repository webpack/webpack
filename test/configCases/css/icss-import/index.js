import './import.css';

it("should compile", () => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" red");
});

it("should re-export", (done) => {
    import("./reexport.module.css").then((module) => {
        try{
            expect(module).toEqual(nsObj({
                ["primary-color"]: "red",
                ['secondary-color']: "block"
            }));
        }catch(e) {
        }
       done() 
    }, done)
})
