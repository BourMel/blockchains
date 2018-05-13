'use strict';

/*************/
/***IMPORTS***/
/*************/
const utils = require('./includes/utils');
const grpc = require('grpc');
const uuidv4 = require('uuid/v4');

/********************/
/***INITIALISATION***/
/********************/

const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;

const args = process.argv.slice(2);

if (args.length === 7 && parseFloat(args[6]) >= 0) {
  const nodeHost = args[0];
  const nodePort = parseInt(args[1]);

  const senderHost = args[2];
  const senderPort = parseInt(args[3]);

  const receiverHost = args[4];
  const receiverPort = parseInt(args[5]);

  const value = parseFloat(args[6]);

  //check the sender has enough unicoins
  let node = new proto.GetUnicoins(
    nodeHost + ':' + nodePort,
    grpc.credentials.createInsecure()
  );

  node.numberOfUnicoins({ host: senderHost, port: senderPort }, function(
    err,
    response
  ) {
    if (err) {
      printConsole(`ERROR: ${err}`);
    } else {
      let ownedUnicoins = response.value;
      let enoughUnicoins = ownedUnicoins >= value;

      if (enoughUnicoins) {
        printConsole(
          `The sender has enough UniCoins (${ownedUnicoins.toFixed(
            2
          )}). Keep going...`
        );

        let nodeExchange = new proto.Exchange(
          nodeHost + ':' + nodePort,
          grpc.credentials.createInsecure()
        );

        nodeExchange.exchange(
          {
            sender: {
              host: senderHost,
              port: senderPort,
            },
            receiver: {
              host: receiverHost,
              port: receiverPort,
            },
            unicoins: { value: value },
          },
          function(err, response) {
            if (err) printConsole(err);

            if (response)
              printConsole(`Exchange accepted: ${response.accepted}`);
          }
        );
      } else {
        printConsole(
          `The sender has not enough UniCoins (${ownedUnicoins.toFixed(
            2
          )}). Abort.`
        );
      }
    }
  });
} else {
  printConsole(
    `USAGE : [node_host] [node_port] [sender_host] [sender_port] [receiver_host] [receiver_port] [unicoins_to_send]`
  );
}

/***************/
/***FUNCTIONS***/
/***************/

/**
 * Print a message in the console and add useful informations about the node
 * @param msg message to print
 */
function printConsole(msg) {
  console.log(`[${utils.host}:${utils.port}]\t${msg}`);
}
