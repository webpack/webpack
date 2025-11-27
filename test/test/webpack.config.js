import EnhancedProgressPlugin from '../../lib/enhanced-progress/EnhancedProgressPlugin.js';

export default {
    entry: {
        main: './src/index.js'
    },
    mode: 'production',
    devtool: false,
    optimization: {
        minimize: false,
        mangleExports: false,
        concatenateModules: false,
        emitOnErrors: true
    },
    plugins: [
        new EnhancedProgressPlugin()
    ]
};
