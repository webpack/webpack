import routes from "virtual:routes";

it("should correctly load virtual modules with the js type.", () => {
    expect(routes[0]).toBe("react");
});
