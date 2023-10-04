# sapphire-confidential

## Miver v2
Transfer anonymously tokens

## Install
```
cd contract

#Install dependencies
npm i

#Configure your keys (test key only)
echo export PRIVATE_KEY=0x... > '.env'
echo export PRIVATE_KEY2=0x... >> '.env'

#make sure you have found both address with  test token for Sapphire testnet

#Deploy the contract
npm run deploy

#Run the test
npm start

cd ..
```

## Run the front
```
cd front

#Install dependencies
npm i

#install the contract
cd src
mkdir contracts
cd contracts
ln -s ../../../confidential/build/contracts/Confidential.json
cd ../..

#Launch the app
npm start
```
