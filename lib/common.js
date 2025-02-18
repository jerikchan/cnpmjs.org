'use strict';

var crypto = require('crypto');
var path = require('path');
var utility = require('utility');
var util = require('util');
var config = require('../config');
var BASIC_PREFIX = /basic /i;
var BEARER_PREFIX = /bearer /i;

exports.getTarballFilepath = function (packageName, packageVersion, filename) {
  // ensure download file path unique
  // TODO: not only .tgz, and also other extname
  var name = filename.replace(/\.tgz$/, '.' + crypto.randomBytes(16).toString('hex'));
  // use filename string md5 instead, fix "ENAMETOOLONG: name too long" error
  name = packageName.replace(/\//g, '-').replace(/\@/g, '') + '-' + packageVersion.substring(0, 20) + '.' + utility.md5(name) + '.tgz';
  return path.join(config.uploadDir, name);
};

exports.getCDNKey = function (name, filename) {
  // if name is scope package name, need to auto fix filename as a scope package file name
  // e.g.: @scope/foo, filename: foo-1.0.0.tgz => filename: @scope/foo-1.0.0.tgz
  if (name[0] === '@' && filename[0] !== '@') {
    filename = name.split('/')[0] + '/' + filename;
  }
  return '/' + name + '/-/' + filename;
};

exports.getUnpublishFileKey = function (name) {
  return `/${name}/sync/unpublish/unpublish-package.json`;
};

exports.getPackageFileCDNKey = function (name, version) {
  return `/${name}/sync/packages/package-${version}.json`;
};

exports.getDistTagCDNKey = function (name, tag) {
  return `/${name}/sync/tags/tag-${tag}.json`;
};

exports.getSyncTagDir = function (name) {
  return `${name}/sync/tags/`;
};

exports.getSyncPackageDir = function (name) {
  return `${name}/sync/packages/`;
};

const TAG_NAME_REG = /^tag-(.+)\.json$/;
exports.getTagNameFromFileName = function (fileName) {
  const res = fileName.match(TAG_NAME_REG);
  return res && res[1];
};

exports.isBackupTagFile = function (fileName) {
  return TAG_NAME_REG.test(fileName);
};

const PACKAGE_NAME_REG = /^package-(.+)\.json$/;
exports.getVersionFromFileName = function (fileName) {
  const res = fileName.match(PACKAGE_NAME_REG);
  return res && res[1];
};

exports.isBackupPkgFile = function (fileName) {
  return PACKAGE_NAME_REG.test(fileName);
};

exports.setDownloadURL = function (pkg, ctx, host) {
  if (pkg.dist) {
    host = host || config.registryHost || ctx.host;
    var protocol = config.protocol || ctx.protocol;
    pkg.dist.tarball = util.format('%s://%s/%s/download/%s-%s.tgz',
      protocol,
      host, pkg.name, pkg.name, pkg.version);
  }
};

exports.isAdmin = function (username) {
  return typeof config.admins[username] === 'string';
};

exports.isMaintainer = function (user, maintainers) {
  if (user.isAdmin) {
    return true;
  }

  var username = user.name;
  maintainers = maintainers || [];
  var match = maintainers.filter(function (item) {
    return item.name === username;
  });

  return match.length > 0;
};

exports.isLocalModule = function (mods) {
  for (var i = 0; i < mods.length; i++) {
    var r = mods[i];
    if (r.package && r.package._publish_on_cnpm) {
      return true;
    }
  }
  return false;
};

exports.isPrivateScopedPackage = function (name) {
  if (!name) {
    return false;
  }

  if (name[0] !== '@') {
    return false;
  }
  return config.scopes.indexOf(name.split('/')[0]) >= 0;
};

var AuthorizeType = exports.AuthorizeType = {
  BASIC: 'BASIC',
  BEARER: 'BEARER',
};

exports.getAuthorizeType = function (ctx) {
  var authorization = (ctx.get('authorization') || '').trim();
  if (BASIC_PREFIX.test(authorization)) {
    return AuthorizeType.BASIC;
  } else if (BEARER_PREFIX.test(authorization)) {
    return AuthorizeType.BEARER;
  }
};

exports.isSyncWorkerRequest = function (ctx) {
  // sync request will contain this query params
  let isSyncWorkerRequest = ctx.query.cache === '0';
  if (!isSyncWorkerRequest) {
    const ua = ctx.headers['user-agent'] || '';
    // old sync client will request with these user-agent
    if (ua.indexOf('npm_service.cnpmjs.org/') !== -1) {
      isSyncWorkerRequest = true;
    }
  }
  return isSyncWorkerRequest;
};
