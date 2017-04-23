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

  describe('use favicon-html-plugin', () => {
    it('should run successfully', function (done) {
      this.timeout(60000)
      const plugin = new Plugin({
        favicon: {
          prefix: 'icons/',
          logo: `${__dirname}/fixtures/icon.png`,
        },
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
  })

  describe('generate a manifest', () => {
    it('should run successfully', function (done) {
      this.timeout(10000)
      const plugin = new Plugin({
        name: 'My Application',
        shortName: 'MyApp',
        backgroundColor: '#333',
      })
      testWithPlugins([plugin], done)
    })

    after(done => rimraf(DIST_FOLDER, done))

    it('should generate manifest.json', () => {
      const manifest = JSON.parse(getFile('manifest.json'))
      expect(manifest).to.eql({
        name: 'My Application',
        short_name: 'MyApp',
        background_color: '#333',
        orientation: 'portrait',
        display: 'standalone',
      })
    })
  })
})
