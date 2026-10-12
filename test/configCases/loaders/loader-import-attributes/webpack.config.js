/** @type {import("../../../../").Configuration} */
module.exports = {
    module: {
        rules: [
            {
                test: /foo\.js$/,
                use: [
                    {
                        loader: function (content) {
                            const attributes = this.importAttributes;

                            if (!attributes || attributes.type !== "custom") {
                                throw new Error(
                                    `Expected importAttributes.type to be 'custom', got ${JSON.stringify(attributes)}`
                                );
                            }
                            return content;
                        }
                    }
                ]
            }
        ]
    }
};