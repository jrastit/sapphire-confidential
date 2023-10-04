const BN = require('bn.js');

const HDWalletProvider = require('@truffle/hdwallet-provider');

const sapphire = require('@oasisprotocol/sapphire-paratime');

const Confidential = artifacts.require("Confidential");
const Confidential2 = artifacts.require("Confidential");

const amount = new BN(web3.utils.toWei("0.1"));

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
  console.log("Balance: ", web3.utils.fromWei(await web3.eth.getBalance(owner)));
  owner_balance = await confidential.get_owner_balance({ from: owner });
  console.log("Owner balance: ", web3.utils.fromWei(owner_balance));
  console.log("Amount: ", web3.utils.fromWei(amount));
  if (owner_balance.gte(amount)) {
    return;
  }
  // estimate_gas = await confidential.add_address.estimateGas({from:owner});
  // console.log("Estimate Gas: ", estimate_gas);
  // gas_price = await web3.eth.getGasPrice();
  // console.log("Gas price: ", gas_price);
  // console.log("Gas fee: ", web3.utils.fromWei(new BN(estimate_gas).mul(new BN(gas_price))));
  address = await confidential.get_last_address({from:owner});
  console.log("Last address: ", address);
  if (address === "0x0000000000000000000000000000000000000000") {
    // 1 : Add address
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
  }
  // 2 : Send to address
  balance0 = await web3.eth.getBalance(address);
  console.log("Balance: ", web3.utils.fromWei(balance0)); 
  if (web3.utils.fromWei(balance0) < amount) {
    tx = await web3.eth.sendTransaction({
      to: address,
      from: my_address,
      value: amount * 10,
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
  }
  // 3 : Send address
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
  address = await confidential.get_last_address({from:owner});
  console.log("Last address: ", address);
}

async function display_address_provider_list(confidential) {
  // addressProviderList = await confidential.get_address_provider_list();
  // console.log("Address Provider List: ", addressProviderList);
}

async function withdraw(confidential) {
  
  // 4 : Withdraw
  owner_balance0 = await confidential.get_owner_balance();
  console.log("\nOwner balance:", web3.utils.fromWei(amount));

  display_address_provider_list(confidential);
  tx = await confidential.virtual_withdraw(owner_balance0);
  tx_info("Virtual Withdraw", tx);
  
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
  display_address_provider_list(confidential);

  // 5 : Fix Withdraw transaction
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
  
  // 6 : Retrive transaction
  withdraw_length = (await confidential.get_withdraw_length()).toNumber();
  console.log("Withdraw length:", withdraw_length);

  transaction = await confidential.get_withdraw_transaction(
    withdraw_length - 1, 
    "0x7d780e822a26b690462A6746aAEdD346b14E90b3", 
    await web3.eth.getGasPrice(),
  );
  console.log("Withdraw transaction:", transaction);
  
  // 7 : Send transaction
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
