import react from "react";
import reactDOM from "react-dom";
import propTypes from "prop-types";

it("should load modules correctly", () => {
	expect(react).toBe("react");
	expect(reactDOM).toBe("react-dom");
	expect(propTypes).toBe("prop-types");
});
