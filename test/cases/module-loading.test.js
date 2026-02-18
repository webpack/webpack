const webpack = require('webpack');
const path = require('path');
const MemoryFs = require('memory-fs');

describe('Enhanced error handling in module loading', () => {
    it('should throw an enhanced error when a module cannot be loaded', done => {
        // Create a simple Webpack configuration
        const compiler = webpack({
            mode: 'development',
            entry: path.resolve(__dirname, 'nonexistent.js'), // Intentionally missing module
            output: {
                path: path.resolve(__dirname, 'dist'),
                filename: 'bundle.js'
            }
        });

        // Use in-memory file system to avoid writing to disk
        compiler.outputFileSystem = new MemoryFs();

        compiler.run((err, stats) => {
            const statsJson = stats.toJson();
            expect(statsJson.errors).toHaveLength(1);
            expect(statsJson.errors[0].message).toContain(
                'The module with id "nonexistent.js" could not be loaded'
            );
            done();
        });
    });
});
