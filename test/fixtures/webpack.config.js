const Plugin = require('../../lib')
const HtmlPlugin = require('html-webpack-plugin')

module.exports = {
  entry: `${__dirname}/entry.js`,
  output: {
    path: `${__dirname}/dist`,
    filename: 'app.js',
    publicPath: '/test/fixtures/dist/',
  },
  plugins: [
    new HtmlPlugin({template: `${__dirname}/index.html`}),
    new Plugin({
      favicon: `${__dirname}/icon.png`
    })
  ],
}
