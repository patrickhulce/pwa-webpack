const joinPath = require('path').join
const _ = require('lodash')
const RawSource = require('webpack-sources').RawSource
const generateFavicons = require('@patrickhulce/favicons')

function getPublicPath(compilation, path) {
  return joinPath(compilation.outputOptions.publicPath || '', path)
}

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
      faviconOutputPath: 'icons/',
    }, options)
  }

  buildManifest(compilation, icons) {
    const manifest = _(this._options)
      .omit(['favicon', 'faviconOutputPath'])
      .mapKeys((value, key) => _.snakeCase(key))
      .value()

    manifest.icons = icons
      .filter(icon => /chrome/.test(icon.filename))
      .map(icon => {
        return {
          src: getPublicPath(compilation, icon.assetName),
          sizes: icon.sizeAsString,
          type: 'image/png',
        }
      })

    return new RawSource(JSON.stringify(manifest, null, 2))
  }

  generateFavicons() {
    if (this._favicons) {
      return this._favicons
    } else if (!this._options.favicon) {
      return Promise.resolve([])
    }

    this._favicons = generateFavicons(this._options.favicon)
    return this._favicons
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, done) => {
      this.generateFavicons()
        .then(icons => {
          icons.forEach(icon => {
            icon.assetName = `${this._options.faviconOutputPath}${icon.filename}`
            compilation.assets[icon.assetName] = new RawSource(icon.image)
          })

          compilation.assets['manifest.json'] = this.buildManifest(compilation, icons)
          done()
        })
        .catch(done)
    })
  }
}

module.exports = PWAPlugin
