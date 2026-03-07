export const opts = {
	route: "/test",
	title: "I am a test"
};

export default {
	data() {
		return {
			I: "Should not be inside the initial bundle"
		};
	}
};
