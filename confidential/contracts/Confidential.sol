// contracts/Confidential.sol
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {EthereumUtils} from "@oasisprotocol/sapphire-contracts/contracts/EthereumUtils.sol";
import {EIP155Signer} from "@oasisprotocol/sapphire-contracts/contracts/EIP155Signer.sol";

contract Confidential {

    struct Address {
        bytes32 pKey;
        address owner;
        uint64 nonce;
        uint256 balance;
        uint256 withdraw;
    }

    struct OwnerInfo {
        address[] addressList;
        uint256 balance;
        uint256 balance_to_withdraw;
        VirtualWithdraw[] withdraw;
    }

    struct VirtualWithdraw {
        address from;
        uint256 amount;
        uint64 nonce;
        bool is_withdraw;
    }

    uint64 public constant GAS_LIMIT = 25000;

    mapping(address => Address) private addressMap;
    mapping(address => OwnerInfo) private ownerMap;
    
    uint256 private balance = 0;
    address[] private addressProviderList;

    constructor() {
        
    }

    /************* Address *******************/

    function add_address() public {
        bytes32 secretKey;
        address pubkeyAddr;
        address owner = msg.sender;
        (pubkeyAddr, secretKey) = EthereumUtils.generateKeypair();
        addressMap[pubkeyAddr].pKey = secretKey;
        addressMap[pubkeyAddr].owner = owner;
        ownerMap[owner].addressList.push(pubkeyAddr);
        addressProviderList.push(pubkeyAddr);
    }

    function get_last_address() public view returns(address pubkeyAddr) {
        return ownerMap[msg.sender].addressList[ownerMap[msg.sender].addressList.length - 1];
    }

    function get_address_length() public view returns (uint256){
        return ownerMap[msg.sender].addressList.length;
    }

    function get_address(uint256 id) public view returns (address addr){
        require (ownerMap[msg.sender].addressList.length > id);
        return ownerMap[msg.sender].addressList[id];
    }

    /************* Send *******************/

    function send_address(address addr) public{
        require (addr.balance > 0);
        require (addressMap[addr].owner == msg.sender);
        require (addressMap[addr].balance == 0);
        addressMap[addr].balance = addr.balance;
        ownerMap[msg.sender].balance += addr.balance;
        balance = balance + addr.balance;
        addressProviderList.push(addr);
    }

    function get_owner_balance() public view returns (uint256){
        return ownerMap[msg.sender].balance;
    }

    /************* Virtual Withdraw *******************/

    function virtual_withdraw(uint256 amount) public {
        require (amount <= ownerMap[msg.sender].balance);
        if (amount > balance) {
            amount = balance;
        }
        if (amount == 0) {
            return;
        }
        for (uint256 i = 0; i < addressProviderList.length; i++) {
            address addr = addressProviderList[i];
            if (addressMap[addr].owner != msg.sender ) {
                uint256 amount2 = amount;
                if ((addressMap[addr].balance - addressMap[addr].withdraw) < amount) {
                    amount2 = addressMap[addr].balance - addressMap[addr].withdraw;
                }
                addressMap[addr].withdraw = addressMap[addr].withdraw + amount2;
                ownerMap[msg.sender].balance -= amount2;
                ownerMap[msg.sender].balance_to_withdraw += amount2;
                balance = balance - amount2;
                amount = amount - amount2;
                ownerMap[msg.sender].withdraw.push(VirtualWithdraw(addr, amount2, 0, false));
                if (amount == 0) {
                    break;
                }
            }
        }
    }


    /************* Withdraw *******************/

    function fix_withdraw_transaction(uint256 id) public {
        require (ownerMap[msg.sender].balance_to_withdraw > 0);
        require (ownerMap[msg.sender].withdraw.length > id);
        VirtualWithdraw storage withdraw = ownerMap[msg.sender].withdraw[id];
        require(withdraw.is_withdraw == false);
        ownerMap[msg.sender].balance_to_withdraw -= withdraw.amount;
        withdraw.nonce = addressMap[withdraw.from].nonce;
        addressMap[withdraw.from].nonce += 1;
        withdraw.is_withdraw = true;
    }

    /*
    function get_withdraw_transaction2(uint256 id, address to, uint256 gasprice) public view returns (
        SignatureRSV memory signature,
        uint64 nonce,
        uint64 gasLimit,
        uint256 amount
    ){
        uint256 gas_fee = gasprice * GAS_LIMIT;
        VirtualWithdraw storage withdraw = ownerMap[msg.sender].withdraw[id];
        require(withdraw.is_withdraw == true);
        require(withdraw.amount > gas_fee, "GAS FEE TO HIGH");
        EIP155Signer.EthTx memory withdraw_transaction = EIP155Signer.EthTx(
            withdraw.nonce,
            gasprice,
            GAS_LIMIT,
            to,
            withdraw.amount - gas_fee,
            new bytes(0),
            block.chainid
        );
        signature = EIP155Signer.signRawTx(
            withdraw_transaction,
            withdraw.from,
            addressMap[withdraw.from].pKey
        );
        return (
            signature,
            withdraw.nonce,
            GAS_LIMIT,
            withdraw.amount - gas_fee
        );
    }
    */

    function get_withdraw_transaction(uint256 id, address to, uint256 gasprice) public view returns (
        bytes memory transaction
        
    ){
        uint256 gas_fee = gasprice * GAS_LIMIT;
        VirtualWithdraw storage withdraw = ownerMap[msg.sender].withdraw[id];
        require(withdraw.is_withdraw == true);
        require(withdraw.amount > gas_fee, "GAS FEE TO HIGH");
        EIP155Signer.EthTx memory withdraw_transaction = EIP155Signer.EthTx(
            withdraw.nonce,
            gasprice,
            GAS_LIMIT,
            to,
            withdraw.amount - gas_fee,
            bytes(""),
            block.chainid
        );
        transaction = EIP155Signer.sign(
            withdraw.from, 
            addressMap[withdraw.from].pKey, 
            withdraw_transaction
        );
    }

    function get_balance_to_withdraw() public view returns (uint256){
        return ownerMap[msg.sender].balance_to_withdraw;
    }
    
    function get_withdraw_length() public view returns (uint256){
        return ownerMap[msg.sender].withdraw.length;
    }

    function get_withdraw(uint256 id) public view returns (address from, uint256 amount, uint64 nonce, bool is_withdraw){
        require (ownerMap[msg.sender].withdraw.length > id);
        VirtualWithdraw storage withdraw = ownerMap[msg.sender].withdraw[id];
        return (withdraw.from, withdraw.amount, withdraw.nonce, withdraw.is_withdraw);
    }

    /************* Debug *******************/    

    function get_my_address() public view returns (address addr){
        return msg.sender;
    }

    

}