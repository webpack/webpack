import App from "./App";

const app = App();

it("should allow to import exposed modules sync", () => {
	expect(app).toBe("ButtonReactReact");
});
