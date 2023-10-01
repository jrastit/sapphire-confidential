const BN = require('bn.js');

const HDWalletProvider = require('@truffle/hdwallet-provider');

const sapphire = require('@oasisprotocol/sapphire-paratime');

const Confidential = artifacts.require("Confidential");
const Confidential2 = artifacts.require("Confidential");

const amount = web3.utils.toWei("0.01");

function tx_info(msg, tx) {
  if (!tx) {
    console.error(`${msg}: tx is null`);
    return;
  }
  if (tx.status == false) {
    console.error(`${msg}: ${tx.tx}`);
  }
  if (tx.transactionHash != null) {
    console.log(`${msg}: ${tx.transactionHash}`);
    return;
  }

  console.log(`${msg}: ${tx.tx}`);
  tx.logs.forEach(element => {
    if (element.event == "AddAddress") {
      console.log(`Address: ${element.args.addr} ${element.args.size.toNumber()}`);
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check_balance(confidential) {
  console.log(`\nUsing contract ${confidential.address}.`);
  owner = (await web3.eth.getAccounts())[0];
  console.log("Owner: ", owner);
  my_address = await confidential.get_my_address({from:owner});
  console.log("My address: ", my_address);
  owner_balance = await confidential.get_owner_balance({from:owner});
  console.log("Owner balance:", web3.utils.fromWei(owner_balance));
  // if (owner_balance > 0) {
  //    return;
  // }
  // tx = await web3.eth.sendTransaction({
  //   to: owner,
  //   from: "0x47b020688c6d184c2a5D9A30AcBBc2AcEb57d15c",
  //   value: amount,
  // });
  // tx_info("Send to owner", tx);
  console.log("Balance: ", web3.utils.fromWei(await web3.eth.getBalance(owner)));
  estimate_gas = await confidential.add_address.estimateGas({from:owner});
  console.log("Estimate Gas: ", estimate_gas);
  gas_price = await web3.eth.getGasPrice();
  console.log("Gas price: ", gas_price);
  console.log("Gas fee: ", web3.utils.fromWei(new BN(estimate_gas).mul(new BN(gas_price))));
  address_len0 = await confidential.get_address_length({from:owner});
  console.log("Address length: ", address_len0.toNumber());
  tx = await confidential.add_address({from:owner})
  tx_info("Add address", tx);
  address_len = address_len0;
  i = 0;
  do {
    await sleep(1000);
    address_len = await confidential.get_address_length({from:owner});
    console.log("Address length: ", address_len.toNumber());
    if (i++ > 10) {
      console.log("Timeout");
      retrun;
    }
  } while (address_len.toNumber() == address_len0.toNumber());
  address = await confidential.get_last_address({from:owner});
  console.log("Last address: ", address);
  balance0 = await web3.eth.getBalance(address);
  console.log("Balance: ", web3.utils.fromWei(balance0)); 
  tx = await web3.eth.sendTransaction({
    to: address,
    from: my_address,
    value: amount,
  });
  tx_info("Send to address", tx);
  balance = balance0;
  i = 0;
  do {
    await sleep(1000);
    balance = await web3.eth.getBalance(address);
    console.log("Balance: ", web3.utils.fromWei(balance));
    if (i++ > 10) {
      console.log("Timeout");
      retrun;
    }
  } while (web3.utils.fromWei(balance0) == web3.utils.fromWei(balance));
  
  owner_balance0 = await confidential.get_owner_balance({ from: owner });
  console.log("Owner balance:", web3.utils.fromWei(owner_balance0));

  tx = await confidential.send_address(address, { from: owner });
  tx_info("Send address", tx);

  owner_balance = owner_balance0;
  i = 0;
  do {
    await sleep(1000);
    owner_balance = await confidential.get_owner_balance({ from: owner });
    console.log("Owner balance:", web3.utils.fromWei(owner_balance));
    if (i++ > 10) {
      console.log("Timeout");
      retrun;
    }
  } while (owner_balance.eq(owner_balance0));
}

async function withdraw(confidential) {
  
  owner_balance0 = await confidential.get_owner_balance();
  console.log("Owner balance:", web3.utils.fromWei(owner_balance0));

  tx = await confidential.virtual_withdraw(owner_balance);
  tx_info("\nVirtual Withdraw", tx);
  
  owner_balance = owner_balance0;
  i = 0;
  do {
    await sleep(1000);
    owner_balance = await confidential.get_owner_balance();
    console.log("Owner balance:", web3.utils.fromWei(owner_balance));
    if (i++ > 10) {
      console.log("Timeout");
      retrun;
    }
  } while (owner_balance.eq(owner_balance0));

  owner_balance0 = await confidential.get_balance_to_withdraw();
  console.log("Owner balance to withdraw:", web3.utils.fromWei(owner_balance0));

  withdraw_length = (await confidential.get_withdraw_length()).toNumber();
  console.log("Withdraw length:", withdraw_length);

  tx = await confidential.fix_withdraw_transaction(withdraw_length - 1);
  tx_info("\nFix Withdraw transaction", tx);
  
  owner_balance = owner_balance0;
  i = 0;
  do {
    await sleep(1000);
    owner_balance = await confidential.get_balance_to_withdraw();
    console.log("Owner balance to withdraw:", web3.utils.fromWei(owner_balance));
    if (i++ > 10) {
      console.log("Timeout");
      retrun;
    }
  } while (owner_balance.eq(owner_balance0));

}

async function process_transaction(confidential) {
  
  withdraw_length = (await confidential.get_withdraw_length()).toNumber();
  console.log("Withdraw length:", withdraw_length);

  transaction = await confidential.get_withdraw_transaction(
    withdraw_length - 1, 
    "0x7d780e822a26b690462A6746aAEdD346b14E90b3", 
    await web3.eth.getGasPrice(),
  );
  console.log("Withdraw transaction:", transaction);

  provider = new HDWalletProvider(
      process.env.PRIVATE_KEY, 
      "https://testnet.sapphire.oasis.dev",
    );
  
  web3.setProvider(provider);
  const tx = await web3.eth.sendSignedTransaction(transaction)
  tx_info("\nFinal transaction", tx);
}

async function exerciseContract() {
  
  provider2 = sapphire.wrap(
    new HDWalletProvider(
      process.env.PRIVATE_KEY2, 
      "https://testnet.sapphire.oasis.dev",
      )
    )
  web3.setProvider(provider2);
  Confidential2.setProvider(provider2);
  
  const confidential2 = await Confidential2.deployed();
  
  await check_balance(confidential2);

  provider = sapphire.wrap(
    new HDWalletProvider(
      process.env.PRIVATE_KEY, 
      "https://testnet.sapphire.oasis.dev",
      )
    )
  web3.setProvider(provider);
  Confidential.setProvider(provider);
  
  const confidential = await Confidential.deployed();
  
  await check_balance(confidential);
  
  await withdraw(confidential);
  
  await process_transaction(confidential);
}

module.exports = async function (callback) {
  try {
    await exerciseContract();
  } catch (e) {
    console.error(e);
  }
  callback();
};
