it("should define global object with property", function() {
	expect(process.env["assign_properties_env"]).toEqual("1");

	expect(Object.keys(process.env).length).toBeGreaterThan(1);
});

module.exports = {
    assign_properties_env: "1"
}
