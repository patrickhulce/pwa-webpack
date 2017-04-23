const _ = require('lodash')
const RawSource = require('webpack-sources').RawSource
const FaviconPlugin = require('favicons-webpack-plugin')

class PWAPlugin {
  constructor(options) {
    this._options = _.assign({
      name: undefined,
      shortName: undefined,
      orientation: 'portrait',
      display: 'standalone',
      startUrl: undefined,
      themeColor: undefined,
      backgroundColor: undefined,

      favicon: undefined,
    }, options)

    if (this._options.favicon) {
      this._favicons = new FaviconPlugin(this._options.favicon)
    }
  }

  buildManifest() {
    const manifest = _(this._options)
      .omit(['favicon'])
      .mapKeys((value, key) => _.snakeCase(key))
      .value()
    return new RawSource(JSON.stringify(manifest, null, 2))
  }

  apply(compiler) {
    if (this._favicons) {
      this._favicons.apply(compiler)
    }

    compiler.plugin('emit', (compilation, done) => {
      compilation.assets['manifest.json'] = this.buildManifest(compilation)
      done()
    })
  }
}

module.exports = PWAPlugin
