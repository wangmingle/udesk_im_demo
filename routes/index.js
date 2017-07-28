var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('underscore');
var UUID = require('uuid');

/**
 * 网页插件基础配置
 * @param 
 * @return 
 */
router.get('/', function(req, res, next) {
	var company_res = {
		web_token: UUID.v1(),
		nonce: UUID.v4(),
		timestamp: new Date().getTime(),
	}
	company_res = _.extend(company_res, config)
	console.log("res", company_res)
  res.render('index', {company_res: company_res});
});

module.exports = router;
