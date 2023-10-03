const Confidential = artifacts.require("Confidential");
var fs = require('fs');

module.exports = function(deployer) {
  deployer.deploy(Confidential)
};
