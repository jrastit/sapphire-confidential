const Confidential = artifacts.require("Confidential");

module.exports = function(deployer) {
  deployer.deploy(Confidential);
};
