const joinPath = require('path').join
const _ = require('lodash')
const cheerio = require('cheerio')
const debug = require('debug')('pwa-webpack:plugin')
const RawSource = require('webpack-sources').RawSource
const generateFavicons = require('@patrickhulce/favicons')

const MetaHandler = require('./meta-handler')

function getPublicPath(compilation, path) {
  return joinPath(compilation.outputOptions.publicPath || '', path)
}

class PWAPlugin {
  constructor(options) {
    this._options = _.assign({
      meta: undefined,
      manifest: undefined,
      icons: undefined,
    }, options)

    this._options.manifest = _.assign({
      name: undefined,
      shortName: undefined,
      orientation: 'portrait',
      display: 'standalone',
      startUrl: undefined,
      themeColor: undefined,
      backgroundColor: undefined,
    }, this._options.manifest)

    this._options.icons = _.assign({
      source: undefined,
      outputPath: 'icons/',
    }, this._options.icons)

    this._options.meta = _.assign({
      charset: 'utf-8',
      themeColor: this._options.manifest.themeColor,
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    }, this._options.meta)
  }

  buildManifest(compilation, icons) {
    const manifest = _(this._options.manifest)
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

  appendIconLinks(compilation, $, $head, icons) {
    icons.forEach(icon => {
      if (!icon.rel) {
        return
      }

      let $icon = $('<link/>')
        .attr('href', getPublicPath(compilation, icon.assetName))
        .attr('rel', icon.rel)

      if (icon.rel === 'icon') {
        $icon = $icon.attr('type', 'image/png')
      }

      if (icon.sizeAsString) {
        $icon = $icon.attr('sizes', icon.sizeAsString)
      }

      debug('adding icon to HTML', icon.assetName)
      $head.append($icon)
    })
  }

  appendMeta(compilation, $, $head) {
    _.forEach(this._options.meta, (value, key) => {
      if (typeof value === 'undefined' || value === false) {
        return
      }

      try {
        const querySelector = MetaHandler.getQuerySelector(key, value)
        if (querySelector && $(querySelector).length) {
          debug(querySelector, 'already exists in document, skipping...')
          return
        }

        let $meta = $('<meta>')
        const attrs = MetaHandler.getTagAttributes(key, value)
        _.forEach(attrs, (value, key) => {
          $meta = $meta.attr(key, value)
        })

        $head.append($meta)
      } catch (err) {
        debug(err)
      }
    })
  }

  replaceHtml(compilation, htmlPluginData, icons) {
    const $ = cheerio.load(htmlPluginData.html)
    const $head = $('head')

    this.appendMeta(compilation, $, $head)
    this.appendIconLinks(compilation, $, $head, icons)

    htmlPluginData.html = $.html()
    return htmlPluginData
  }

  generateFavicons() {
    if (this._icons) {
      return Promise.resolve(this._icons)
    } else if (!this._options.icons.source) {
      return Promise.resolve([])
    }

    return generateFavicons(this._options.icons.source)
      .then(icons => {
        icons.forEach(icon => {
          icon.assetName = `${this._options.icons.outputPath}${icon.filename}`
        })

        this._icons = icons
        return icons
      })
  }

  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, done) => {
        this.generateFavicons()
          .then(icons => this.replaceHtml(compilation, htmlPluginData, icons))
          .then(htmlData => done(null, htmlData))
          .catch(err => {
            debug(err)
            done(err, htmlPluginData)
          })
      })
    })

    compiler.plugin('emit', (compilation, done) => {
      this.generateFavicons()
        .then(icons => {
          icons.forEach(icon => {
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
