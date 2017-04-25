/* eslint-disable camelcase */
const fs = require('fs')
const path = require('path')

const _ = require('lodash')
const rimraf = require('rimraf')
const expect = require('chai').expect
const webpack = require('webpack')
const Plugin = require('../lib')

const DIST_FOLDER = path.join(__dirname, 'fixtures/dist/')

describe('PWAPlugin', () => {
  const defaultConfig = require('./fixtures/webpack.config.js')

  function getFile(file) {
    return fs.readFileSync(`${DIST_FOLDER}/${file}`, 'utf8')
  }

  function getFileStats(file) {
    return fs.statSync(`${DIST_FOLDER}/${file}`)
  }

  function testWithPlugins(plugins, done) {
    const config = _.cloneDeep(defaultConfig)
    config.plugins = [config.plugins[0]].concat(plugins)
    webpack(config, err => {
      try {
        if (err) {
          done(err)
        } else {
          done()
        }
      } catch (err) {
        done(err)
      }
    })
  }

  describe('basic usage', () => {
    let manifest

    it('should run successfully', function (done) {
      this.timeout(10000)
      testWithPlugins([new Plugin({
        icons: `${__dirname}/fixtures/icon.png`,
      })], done)
    })

    after(done => rimraf(DIST_FOLDER, done))

    it('should generate favicon files', () => {
      const favicon = getFileStats('icons/favicon.ico')
      expect(favicon).to.have.property('size').greaterThan(5000)
    })

    it('should generate manifest.json', () => {
      manifest = JSON.parse(getFile('manifest.json'))
    })

    it('should pass through manifest options', () => {
      expect(manifest).to.have.property('background_color', '#fff')
      expect(manifest).to.have.property('orientation', 'portrait')
      expect(manifest).to.have.property('display', 'standalone')
    })

    it('should add meta to HTML', () => {
      const html = getFile('index.html')
      expect(html).to.include('<!DOCTYPE html>')
      expect(html).to.match(/charset="utf-8"/)
      expect(html).to.match(/name="viewport"/)
      expect(html).to.match(/name="apple-mobile-web-app-capable"/)
    })
  })

  describe('advanced usage', () => {
    let manifest

    it('should run successfully', function (done) {
      this.timeout(10000)
      const plugin = new Plugin({
        title: 'My Application',
        themeColor: '#393',

        meta: {
          alreadyThere: 'ignored',
          ieOnly: {'http-equiv': 'X-UA-Compatible', content: 'IE=edge'},
        },
        manifest: {
          shortName: 'MyApp',
          backgroundColor: '#333',
          __filename__: 'my-manifest.json',
        },
        icons: {source: `${__dirname}/fixtures/icon.png`},
      })

      testWithPlugins([plugin], done)
    })

    after(done => rimraf(DIST_FOLDER, done))

    it('should generate favicon files', () => {
      const favicon = getFileStats('icons/favicon.ico')
      const chrome = getFileStats('icons/android-chrome-512x512.png')
      const apple = getFileStats('icons/apple-touch-icon-180x180.png')
      expect(favicon).to.have.property('size').greaterThan(5000)
      expect(chrome).to.have.property('size').greaterThan(5000)
      expect(apple).to.have.property('size').greaterThan(5000)
    })

    it('should generate manifest.json', () => {
      manifest = JSON.parse(getFile('my-manifest.json'))
    })

    it('should pass through manifest options', () => {
      expect(manifest).to.have.property('name', 'My Application')
      expect(manifest).to.have.property('short_name', 'MyApp')
      expect(manifest).to.have.property('theme_color', '#393')
      expect(manifest).to.have.property('background_color', '#333')
      expect(manifest).to.have.property('start_url', '/test/fixtures/dist/index.html')
      expect(manifest).to.have.property('orientation', 'portrait')
      expect(manifest).to.have.property('display', 'standalone')
    })

    it('should add icons to manifest', () => {
      const icons = manifest.icons
      expect(icons).to.have.length(4)
      expect(icons[0]).to.eql({
        sizes: '192x192',
        type: 'image/png',
        src: '/test/fixtures/dist/icons/android-chrome-192x192.png',
      })
    })

    it('should add icons to HTML', () => {
      const html = getFile('index.html')
      expect(html).to.include('<!DOCTYPE html>')

      const relIcons = html.match(/rel=.icon./g)
      const relFavicon = html.match(/rel=.shortcut icon/g)
      const relAppleIcon = html.match(/rel=.apple-touch-icon/g)
      expect(relIcons).to.have.length(3)
      expect(relFavicon).to.have.length(1)
      expect(relAppleIcon).to.have.length(1)
    })

    it('should add meta to HTML', () => {
      const html = getFile('index.html')
      expect(html).to.include('<!DOCTYPE html>')
      // contains default meta values
      expect(html).to.match(/charset="utf-8"/)
      expect(html).to.match(/name="viewport"/)
      expect(html).to.match(/name="apple-mobile-web-app-capable"/)

      // doesn't override existing meta values
      expect(html).to.match(/name="already-there"/)
      expect(html).to.match(/content="existing"/)

      // contains custom meta values
      expect(html).to.match(/X-UA-Compatible/)
      expect(html).to.match(/theme-color[^>]+393/)
    })

    it('should add manifest to HTML', () => {
      const html = getFile('index.html')
      expect(html).to.include('<!DOCTYPE html>')
      expect(html).to.include('rel="manifest"')
      expect(html).to.include('href="/test/fixtures/dist/my-manifest.json"')
    })

    it('should add title to HTML', () => {
      const html = getFile('index.html')
      expect(html).to.include('<!DOCTYPE html>')
      expect(html).to.include('<title>My Application</title>')
    })
  })
})
