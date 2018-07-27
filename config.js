'use strict';

exports.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://alyse:Zerg1ing@ds245901.mlab.com:45901/alysebos-blog-app';
exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://alyse:Zerg1ing@ds245901.mlab.com:45901/alysebos-blog-app';
exports.PORT = process.env.PORT || 8080;