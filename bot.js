var Discord = require('discord.io');

var logger = require('winston');
var auth = require('./auth.json');
var jsonQuery = require('json-query');

const axios = require('axios');


// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';


// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});


bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it needs to execute a command
    // for this script it will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        var txid = args[1];
        // var price = 0;

        args = args.splice(1);

        axios.defaults.baseURL = "https://blocks.diazwallet.online/api";

        function axiosGet(path, params) {
            axios.get(path, {
                    params: params
                })
                .then(function (response) {
                    bot.sendMessage({ to: channelID, message: "The difficulty is:" + response.data});
                    // console.log(response);
                })
                .catch(function (error) {
                    // console.log(error);
                    bot.sendMessage({ to: channelID, message: "The request was not found!"});
                })
                .then(function () {
                    return;
                });
        }

        // need to refactor - too much repetition

        var fetchEscodex = new Promise(function(resolve, reject) {
                axios.get('http://labs.escodex.com/api/ticker')
                .then(response => {
                    for(var key in response.data){
                      if (response.data[key].quote == 'DIAZ') { 
                        var output = response.data[key].latest;
                      }
                    }
                    resolve(output);
                })
                .catch(error => console.log(error));
        });

        var fetchCrypto = new Promise(function(resolve, reject) {
            axios.get('https://api.crypto-bridge.org/api/v1/ticker')
                .then(response => {
                    for(var key in response.data){
                      if (response.data[key].id == 'DIAZ_BTC') { 
                        var output = response.data[key].last;
                      }
                    }
                    resolve(output);
                })
                .catch(error => console.log(error));
        });

        switch(cmd) {
            case 'help':
                return bot.sendMessage({ to: channelID, message: 'Available commands: difficulty, tx, balance, price, exchanges, escodex, crypto'})
                break;

            case 'difficulty':
                return axiosGet("/getdifficulty");
                break;

            case 'tx':
                axios.get('/getrawtransaction', {
                    params: {
                        txid: txid,
                        decrypt: "1"
                    }
                })
                .then(function (response) {
                    // if (response.data.confirmations) === 'undefined' {
                    //     response.data.confirmations = 0;
                    // }
                    bot.sendMessage({ to: channelID, message: "The transaction has: " + response.data.confirmations + " confirmations"});
                    // console.log(response);
                })
                .catch(function (error) {
                    // console.log(error);
                    bot.sendMessage({ to: channelID, message: "The tx was not found!"});
                })
                .then(function () {
                    // bot.sendMessage({ to: channelID, message: "Executed!"});
                    return;
                });
                break;

            case 'balance':
                axios.get('https://blocks.diazwallet.online/ext/getaddress/'+txid)
                .then(function (response) {
                    return bot.sendMessage({ to: channelID, message: "The wallet balance is:" + response.data.balance + " DIAZ."});
                    console.log(response.data);
                })
                .catch(function (error) {
                    // console.log(error);
                    return bot.sendMessage({ to: channelID, message: "The wallet was not found!"});
                })
                .then(function () {
                    // bot.sendMessage({ to: channelID, message: "Executed!"});
                    return;
                });
                break;

            case 'crypto':
                fetchCrypto.then(function(output) {
                    return bot.sendMessage({to: channelID, message: "The CryptoBridge exchange rate is: " + output + "BTC"});
                });
                break;

            case 'escodex':
                fetchEscodex.then(function(output) {
                    return bot.sendMessage({to: channelID, message: "The Escodex exchange rate is: " + output + "BTC"});
                });
                break;

            case 'price':
            var total = 0.00000000;
            // need to refactor - too much repetition
                (async () => {
                  const [crypto, escodex] = await Promise.all([
                    axios.get('https://api.crypto-bridge.org/api/v1/ticker')
                    .then(response => {
                        for(var key in response.data){
                          if (response.data[key].id == 'DIAZ_BTC') { 
                            var output = response.data[key].last;
                          }
                        }
                        return output;
                    }),
                    axios.get('http://labs.escodex.com/api/ticker')
                    .then(response => {
                        for(var key in response.data){
                          if (response.data[key].quote == 'DIAZ') { 
                            var output = response.data[key].latest;
                          }
                        }
                        return output;
                    })
                  ]);

                  // console.log(stex);
                  // console.log(crypto);
                  // console.log(escodex);

                  // do something with all responses
                  // var total1 = parseFloat(stex).toFixed(8);
                  var total2 = parseFloat(crypto).toFixed(8);
                  var total3 = parseFloat(escodex).toFixed(8);

                  total = (parseFloat(total2) + parseFloat(total3)) / 2;
                  return bot.sendMessage({to: channelID, message: "The current average DIAZ exchange rate is: " + parseFloat(total).toFixed(8) + "BTC"});  

                })();
                break; 

            case 'exchanges' :

                return bot.sendMessage({to: channelID, message: "The current listed exchanges: CryptoBridge and Escodex"}); 
                break;

            case 'btc' :

                axios.get('https://api.coindesk.com/v1/bpi/currentprice/zar.json')
                    .then(response => {
                        var usd = response.data.bpi.USD.rate_float;
                        return bot.sendMessage({to: channelID, message: "The BTC exchange rate is: $" + usd});
                    });
                axios.get('https://api.mybitx.com/api/1/ticker?pair=XBTZAR')
                    .then(response => {
                        var zar = response.data.last_trade;
                        return bot.sendMessage({to: channelID, message: "The ZAR exchange rate is: R" + zar});
                    });
                break;

            default:
                return bot.sendMessage({ to: channelID, message: 'Unknown command.' });
        }
    }
})
