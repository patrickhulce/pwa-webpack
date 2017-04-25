const _ = require('lodash')

class MetaHanlder {
  static getQuerySelector(key, value) {
    if (typeof value === 'object') {
      return false
    } else if (key === 'charset') {
      return 'meta[charset]'
    } else {
      return `meta[name=${_.kebabCase(key)}]`
    }
  }

  static getTagAttributes(key, value) {
    if (typeof value === 'object') {
      return value
    } else if (key === 'charset') {
      return {charset: value}
    } else {
      return {name: _.kebabCase(key), content: value}
    }
  }
}

module.exports = MetaHanlder
