import React from "react";
// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";
import * as sapphire from "@oasisprotocol/sapphire-paratime";

// We import the contract's artifacts and address here, as we are going to be
// using them with ethers
import ConfidentialArtifact from "../contracts/Confidential.json";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Withdraw } from "./Withdraw";
import { To } from "./To";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = "23295";

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

const NODE_URL = "https://testnet.sapphire.oasis.dev";

// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// This component is in charge of doing these things:
//   1. It connects to the user's wallet
//   2. Initializes ethers and the Token contract
//   3. Polls the user balance to keep it updated.
//   4. Transfers tokens by sending transactions
//   5. Renders the whole application
//
// Note that (3) and (4) are specific of this sample application, but they show
// you how to keep your Dapp and contract's state in sync,  and how to send a
// transaction.
export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    // We store multiple things in Dapp's state.
    // You don't need to follow this pattern, but it's an useful example.
    this.initialState = {
      // The info of the token (i.e. It's Name and symbol)
      confidentialData: undefined,
      // The user's address and balance
      selectedAddress: undefined,
      confidentialAddress: undefined,
      balance: undefined,
      confidentialBalance: undefined,
      virtualBalance: undefined,
      // The ID about transactions being sent, and any possible error with them
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      step: 0,
    };

    this.state = this.initialState;

    //this._connectWallet();
  }

  getStepStyle(step_id) {
    step_id = step_id * 2 - 1;
    return this.state.step < step_id
      ? { color: "black" }
      : this.state.step > step_id
      ? { color: "green" }
      : { color: "orange" };
  }

  checkBalace(balance, value) {
    return balance && ethers.utils.formatEther(balance) >= value;
  }

  displayBalance(balance) {
    return balance ? ethers.utils.formatEther(balance) + " TEST" : "Loading...";
  }

  render() {
    switch (this.state.step) {
      case 0:
        this.setState({ step: 1 });
        break;
      case 2:
        this.setState({ step: 3 });
        break;
      case 3:
        if (this.checkBalace(this.state.confidentialBalance, 2)) {
          this.setState({ waitStep: undefined, step: 4 });
        }
        break;
      case 4:
        this.setState({ step: 5 });
        break;
      case 5:
        if (
          (this.state.confidentialData?.address &&
            this.state.confidentialData?.address !==
              ethers.constants.AddressZero) ||
          this.checkBalace(this.state.confidentialData?.owner_balance, 1) ||
          this.checkBalace(this.state.confidentialData?.balance_to_withdraw, 1)
        ) {
          this.setState({ waitStep: undefined, step: 6 });
        }
        break;
      case 6:
        this.setState({ step: 7 });
        break;
      case 7:
        if (
          this.checkBalace(this.state.virtualBalance, 1) ||
          this.checkBalace(this.state.confidentialData?.owner_balance, 1) ||
          this.checkBalace(this.state.confidentialData?.balance_to_withdraw, 1)
        ) {
          this.setState({ waitStep: undefined, step: 8 });
        }
        break;
      case 8:
        this.setState({ step: 9 });
        break;
      case 9:
        if (
          this.checkBalace(this.state.confidentialData?.owner_balance, 1) ||
          this.checkBalace(this.state.confidentialData?.balance_to_withdraw, 1)
        ) {
          this.setState({ waitStep: undefined, step: 10 });
        }
        break;
      case 10:
        this.setState({ step: 11 });
        break;
      case 11:
        if (
          this.checkBalace(this.state.confidentialData?.balance_to_withdraw, 1)
        ) {
          this.setState({ waitStep: undefined, step: 12 });
        }
        break;
      case 12:
        this.setState({ step: 13 });
        break;
      case 13:
        if (this.state.confidentialData?.withdraw_list !== undefined) {
          this.setState({ waitStep: undefined, step: 14 });
        }
        break;
      case 14:
        this.setState({ step: 15 });
        break;
      case 15:
        if (this.state.to !== undefined) {
          this.setState({ step: 16 });
        }
        break;
      case 16:
        this.setState({ step: 17 });
        break;
      case 17:
        let is_done = true;
        for (
          let i = 0;
          i < this.state.confidentialData?.withdraw_list.length;
          i++
        ) {
          if (!this.state.confidentialData?.withdraw_list[i].has_withdraw) {
            is_done = false;
            break;
          }
        }
        if (is_done) {
          this.setState({ step: 2 });
        }
        break;
      default:
    }
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install a wallet.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // The next thing we need to do, is to ask the user to connect their wallet.
    // When the wallet gets connected, we are going to save the users's address
    // in the component's state. So, if it hasn't been saved yet, we have
    // to show the ConnectWallet component.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    //console.log(this.state.selectedAddress, this.state.balance)
    // If the token data or the user's balance hasn't loaded yet, we show
    // a loading component.
    if (!this.state.selectedAddress) {
      return <Loading />;
    }

    // If everything is loaded, we render the application.
    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>Confidential</h1>
            <p>
              Send confidential transactions on Ethereum compatible blockchains
              ({this.state.step})
            </p>
            <p>
              Your main (public) address is <b>{this.state.selectedAddress}</b>,
              you have <b>{this.displayBalance(this.state.balance)}</b>.
            </p>
            {this.state.confidentialData &&
              this.state.confidentialData?.my_address && (
                <p>
                  Your confidential address is{" "}
                  <b>{this.state.confidentialAddress}</b>, you have{" "}
                  <b>{this.displayBalance(this.state.confidentialBalance)}</b>.
                </p>
              )}
            <p>
              You are going to transfer tokens anonymously. To make sure nobody
              know you are usig a mixer, don't link your main address to you
              confidential address (By sending funds inbetween).
            </p>
            <div className="row">
              <div className="col-12">
                {/* 
              Sending a transaction isn't an immediate action. You have to wait
              for it to be mined.
              If we are waiting for one, we show a message here.
            */}
                {this.state.txBeingSent && (
                  <WaitingForTransactionMessage
                    txHash={this.state.txBeingSent}
                  />
                )}

                {/* 
              Sending a transaction can fail in multiple ways. 
              If that happened, we show a message here.
            */}
                {this.state.transactionError && (
                  <TransactionErrorMessage
                    message={this._getRpcErrorMessage(
                      this.state.transactionError
                    )}
                    dismiss={() => this._dismissTransactionError()}
                  />
                )}
              </div>
            </div>
            <p style={this.getStepStyle(1)}>
              Step 1: get a confidential Address (
              {this.state.confidentialAddress})
            </p>
            <p style={this.getStepStyle(2)}>
              Step 2: Found your confidential Address with 2 TEST (
              {this.displayBalance(this.state.confidentialBalance)})
            </p>
            <p style={this.getStepStyle(3)}>
              Step 3: Request a virtual address (
              {this.state.confidentialData
                ? this.state.confidentialData.address
                : "Loading..."}
              )
            </p>
            {!this.state.waitStep &&
              this.state.step === 5 &&
              this.state.confidentialData && (
                <div>
                  <div className="form-group">
                    <button
                      className="btn btn-primary"
                      type="submit"
                      onClick={() => this._addAddress()}
                    >
                      Add address
                    </button>
                  </div>
                </div>
              )}
            <p style={this.getStepStyle(4)}>
              Step 4: Fond the address from your main address (
              {this.displayBalance(this.state.virtualBalance)})
            </p>
            {!this.state.waitStep &&
              this.state.step === 7 &&
              this.state.virtualBalance && (
                <div>
                  <Withdraw
                    withdrawTokens={(amount) => this._found(amount)}
                    tokenSymbol="TEST"
                    caption="Found"
                  />
                </div>
              )}
            <p style={this.getStepStyle(5)}>
              Step 5: Add your address found to your account (
              {this.displayBalance(this.state.confidentialData?.owner_balance)})
            </p>
            {!this.state.waitStep &&
              this.state.step === 9 &&
              this.state.confidentialData?.owner_balance && (
                <div>
                  <div className="form-group">
                    <button
                      className="btn btn-primary"
                      type="submit"
                      onClick={() => this._sendAddress()}
                    >
                      Add address found
                    </button>
                  </div>
                </div>
              )}
            <p style={this.getStepStyle(6)}>
              Step 6: Withdraw your funds to your virtual account (
              {this.displayBalance(
                this.state.confidentialData?.balance_to_withdraw
              )}
              )
            </p>
            {!this.state.waitStep &&
              this.state.step === 11 &&
              this.state.confidentialData?.balance_to_withdraw && (
                <div>
                  <Withdraw
                    withdrawTokens={(amount) => this._withdrawTokens(amount)}
                    tokenSymbol="TEST"
                  />
                </div>
              )}
            <p style={this.getStepStyle(7)}>Step 7: Load withdraw list</p>
            <p style={this.getStepStyle(8)}>Step 8: Set destination address</p>
            {!this.state.to && (
              <div>
                <To setTo={(to) => this._setTo(to)} />
              </div>
            )}
            <p style={this.getStepStyle(9)}>Step 7: Withdraw</p>
            {!this.state.waitStep &&
              this.state.confidentialData?.withdraw_list && (
                <div>
                  {this.state.confidentialData.withdraw_list.map(
                    (withdraw, index) => (
                      <p
                        key={index}
                        style={{
                          color: withdraw.is_withdraw
                            ? withdraw.has_withdraw
                              ? "green"
                              : "red"
                            : "orange",
                        }}
                      >
                        {withdraw.id} : Withdraw address : {withdraw.from} nonce
                        : {withdraw.nonce.toString()} balance :{" "}
                        {this.displayBalance(withdraw.amount)}
                        {!withdraw.is_withdraw && this.state.step === 17 && (
                          <>
                            &nbsp;{" "}
                            <button
                              className="btn btn-primary"
                              type="submit"
                              onClick={() => this._withdrawAddress(withdraw)}
                            >
                              Prepare Withdraw
                            </button>
                          </>
                        )}
                        {withdraw.is_withdraw &&
                          !withdraw.has_withdraw &&
                          this.state.to && (
                            <>
                              &nbsp;{" "}
                              <button
                                className="btn btn-primary"
                                type="submit"
                                onClick={() =>
                                  this._withdraw(withdraw, this.state.to)
                                }
                              >
                                Withdraw
                              </button>
                            </>
                          )}
                        {withdraw.hash && (
                          <>
                            <br />
                            <a
                              href={
                                "https://testnet.explorer.sapphire.oasis.dev/tx/" +
                                withdraw.hash
                              }
                              target="_blank" rel="noreferrer"
                            >
                              Hash : {withdraw.hash}
                            </a>
                          </>
                        )}
                      </p>
                    )
                  )}
                </div>
              )}
          </div>
        </div>

        <hr />
      </div>
    );
  }

  componentWillUnmount() {
    // We poll the user's balance, so we have to stop doing that when Dapp
    // gets unmounted
    this._stopPollingData();
  }

  async _connectWallet() {
    console.log("Connect wallet");

    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // Once we have the address, we can initialize the application.
    // First we check the network
    this._checkNetwork();

    this._initialize(selectedAddress);
  }

  _initialize(selectedAddress) {
    console.log("Initialize", selectedAddress);

    // This method initializes the dapp

    this.setState({
      selectedAddress,
      step: 1,
    });

    // Then, we initialize ethers, fetch the token's data, and start polling
    // for the user's balance.

    // Fetching the token data and the user's balance are specific to this
    // sample project, but you can reuse the same initialization pattern.
    this._initializeEthers();
  }

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    this._provider = new ethers.providers.Web3Provider(window.ethereum);
    this._providerSapphire = new ethers.providers.JsonRpcProvider(NODE_URL);
    const mnemonic = localStorage.getItem("unsafe_mnemonic");
    if (mnemonic) {
      this._wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(
        this._providerSapphire
      );
      console.log("Wallet loaded", this._wallet.address);
    } else {
      this._wallet = ethers.Wallet.createRandom().connect(
        this._providerSapphire
      );
      console.log("New wallet created", this._wallet.mnemonic);
      localStorage.setItem("unsafe_mnemonic", this._wallet.mnemonic.phrase);
      console.log("New wallet created", this._wallet.address);
    }
    // We first store the user's address in the component's state

    this.setState({
      confidentialAddress: this._wallet.address,
      step: 2,
    });

    this._signerSapphire = sapphire.wrap(this._wallet);

    // Then, we initialize the contract using that provider and the token's
    // artifact. You can do this same thing with your contracts.
    this._confidential = new ethers.Contract(
      ConfidentialArtifact.networks["23295"].address,
      ConfidentialArtifact.abi,
      this._signerSapphire
    );
    this._startPollingData();
  }

  // The next two methods are needed to start and stop polling data. While
  // the data being polled here is specific to this example, you can use this
  // pattern to read any data from your contracts.
  //
  // Note that if you don't need it to update in near real time, you probably
  // don't need to poll it. If that's the case, you can just fetch it when you
  // initialize the app, as we do with the token data.
  _startPollingData() {
    // We run it once immediately so we don't have to wait for it
    this._updateBalance();
  }

  _stopPollingData() {
    clearTimeout(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  // The next two methods just read from the contract and store the results
  // in the component state.
  async _getConfidentialData() {
    if (this.state.selectedAddress !== undefined) {
      try {
        const my_address = await this._confidential.get_my_address();
        console.log("My address", my_address);
        const owner_balance = await this._confidential.get_owner_balance();
        console.log("Owner balance", owner_balance);
        const balance_to_withdraw =
          await this._confidential.get_balance_to_withdraw();
        console.log("Balance to withdraw", balance_to_withdraw);
        let address = this.state.confidentialData?.address;
        if (this.state.step === 5) {
          address = await this._confidential.get_last_address();
          console.log("Virtual Address", address);
        }
        let withdraw_list = this.state.confidentialData?.withdraw_list;
        if (
          this.state.step === 13 ||
          this.state.step === 17 ||
          this.state.step > 2
        ) {
          if (!withdraw_list) withdraw_list = [];
          const withdraw_length = (
            await this._confidential.get_withdraw_length()
          ).toNumber();
          console.log("Withdraw length", withdraw_length);
          for (let i = 0; i < withdraw_length; i++) {
            let withdraw = await this._confidential.get_withdraw(i);
            withdraw = {
              id: i,
              hash: undefined,
              ...withdraw,
            };
            console.log("Withdraw", withdraw);
            let found = false;
            for (let j = 0; j < withdraw_list.length; j++) {
              if (withdraw_list[j].id === withdraw.id) {
                withdraw_list[j].is_withdraw = withdraw.is_withdraw;
                withdraw_list[j].nonce = withdraw.nonce;
                found = true;
                break;
              }
            }
            if (!found) {
              withdraw_list.push(withdraw);
            }
          }
          for (let i = 0; i < withdraw_list.length; i++) {
            if (
              withdraw_list[i].is_withdraw &&
              !withdraw_list[i].has_withdraw
            ) {
              withdraw_list[i].has_withdraw =
                (await this._provider.getTransactionCount(
                  withdraw_list[i].from
                )) > withdraw_list[i].nonce;
              console.log("Withdraw update", withdraw_list[i]);
            }
          }
        }
        this.setState({
          confidentialData: {
            my_address,
            owner_balance,
            balance_to_withdraw,
            address,
            withdraw_list,
          },
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      this.setState({ confidentialData: undefined });
    }
    this._pollDataInterval = setTimeout(() => this._updateBalance(), 1);
  }

  async _updateBalance() {
    let balance = undefined;
    let confidentialBalance = undefined;
    let virtualBalance = this.state.virtualBalance;
    console.log("Address", this.state.selectedAddress);
    if (this.state.selectedAddress !== undefined) {
      try {
        balance = await this._provider.getSigner().getBalance();
        console.log("Balance", balance.toString());
        confidentialBalance = await this._wallet.getBalance();
        if (this.state.step === 7 && this.state.confidentialData?.address) {
          virtualBalance = await this._provider.getBalance(
            this.state.confidentialData?.address
          );
          console.log("virtualBalance", virtualBalance.toString());
        }
      } catch (error) {
        console.error(error);
      }
    }
    this.setState({ balance, confidentialBalance, virtualBalance });
    this._getConfidentialData();
  }

  async _addAddress() {
    this.setState({ waitStep: this.state.step + 1 });
    console.log("Add address");
    try {
      const tx = await this._confidential.add_address();
      console.log("Tx", tx);
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      console.log("Receipt", receipt);
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ waitStep: undefined, transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  async _setTo(address) {
    console.log("Set to", address);
    this.setState({ to: address });
  }

  async _sendAddress() {
    this.setState({ waitStep: this.state.step + 1 });
    console.log("Send address");
    try {
      const tx = await this._confidential.send_address(
        this.state.confidentialData?.address
      );
      console.log("Tx", tx);
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      console.log("Receipt", receipt);
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ waitStep: undefined, transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  async _withdrawTokens(amount) {
    this.setState({ waitStep: this.state.step + 1 });
    console.log("Withdraw tokes");
    try {
      const tx = await this._confidential.virtual_withdraw(
        ethers.utils.parseEther(amount)
      );
      console.log("Tx", tx);
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      console.log("Receipt", receipt);
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ waitStep: undefined, transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  async _withdrawAddress(withdraw) {
    const id = withdraw.id;
    console.log("Withdraw address", id);
    try {
      const tx = await this._confidential.fix_withdraw_transaction(id);
      console.log("Tx", tx);
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      console.log("Receipt", receipt);
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ waitStep: undefined, transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  async _found(amount) {
    this.setState({ waitStep: this.state.step + 1 });
    console.log("Found", amount);
    try {
      const tx = await this._provider.getSigner().sendTransaction({
        to: this.state.confidentialData?.address,
        value: ethers.utils.parseEther(amount),
      });
      console.log("Tx", tx);
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      console.log("Receipt", receipt);
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ waitStep: undefined, transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  async _withdraw(withdraw, to) {
    const id = withdraw.id;
    console.log("Send transaction", id, to);
    console.log("Withdraw address", id);
    let tx;
    try {
      const gasPrice = await this._providerSapphire.getGasPrice();
      const signed_tx = await this._confidential.get_withdraw_transaction(
        id,
        this.state.to,
        gasPrice
      );
      console.log("Signed tx", signed_tx);
      tx = await this._providerSapphire.sendTransaction(signed_tx);
      console.log("Tx", tx);
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      console.log("Receipt", receipt);
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ waitStep: undefined, transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      withdraw.hash = tx.hash;
      this.setState({ txBeingSent: undefined });
    }
  }

  // This method sends an ethereum transaction to transfer tokens.
  // While this action is specific to this application, it illustrates how to
  // send a transaction.
  async _transferTokens(to, amount) {
    // Sending a transaction is a complex operation:
    //   - The user can reject it
    //   - It can fail before reaching the ethereum network (i.e. if the user
    //     doesn't have ETH for paying for the tx's gas)
    //   - It has to be mined, so it isn't immediately confirmed.
    //     Note that some testing networks, like Hardhat Network, do mine
    //     transactions immediately, but your dapp should be prepared for
    //     other networks.
    //   - It can fail once mined.
    //
    // This method handles all of those things, so keep reading to learn how to
    // do it.

    try {
      // If a transaction fails, we save that error in the component's state.
      // We only save one such error, so before sending a second transaction, we
      // clear it.
      this._dismissTransactionError();

      // We send the transaction, and save its hash in the Dapp's state. This
      // way we can indicate that we are waiting for it to be mined.
      const tx = await this._confidential.add_address();
      this.setState({ txBeingSent: tx.hash });

      // We use .wait() to wait for the transaction to be mined. This method
      // returns the transaction's receipt.
      const receipt = await tx.wait();

      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        // We can't know the exact error that made the transaction fail when it
        // was mined, so we throw this generic one.
        throw new Error("Transaction failed");
      }

      // If we got here, the transaction was successful, so you may want to
      // update your state. Here, we update the user's balance.
      await this._updateBalance();
    } catch (error) {
      // We check the error code to see if this error was produced because the
      // user rejected a tx. If that's the case, we do nothing.
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // Other errors are logged and stored in the Dapp's state. This is used to
      // show them to the user, and for debugging.
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // This method just clears part of the state.
  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  // This is an utility method that turns an RPC error into a human readable
  // message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method resets the state
  _resetState() {
    this.setState(this.initialState);
  }

  async _switchChain() {
    console.log("Switch chain");
    const chainIdHex = `0x${HARDHAT_NETWORK_ID.toString(16)}`;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await this._initialize(this.state.selectedAddress);
  }

  // This method checks if the selected network is Localhost:8545
  _checkNetwork() {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      this._switchChain();
    }
  }
}
