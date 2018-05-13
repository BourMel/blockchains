'use strict';

/*************/
/***IMPORTS***/
/*************/
const utils = require('./includes/utils');
const grpc = require('grpc');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');

/********************/
/***INITIALISATION***/
/********************/
const MAX_OP = 42;

const args = process.argv.slice(2);
utils.initHostPort(args);

const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;
const neighbors = [];
let blockchain = [];
let waiting_list = [];
let nodeMembers = [];

const RECEIVED_UNICOINS = 'received_unicoins';
const GAVE_UNICOINS = 'gave_unicoins';
const PARTICIPANT_REGISTERED = 'participant_registered';

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

/**
 * Add a neighbor to the node
 * @param neighbor neighbor to add
 */
function addNeighbor(neighbor) {
  if (!utils.hasObject(neighbors, neighbor)) {
    printConsole(`new neighbor: ${JSON.stringify(neighbor)}`);
    neighbors.push(neighbor);
  }
}

/**
 * Launch the server part of the node
 */
function startServer() {
  'use strict';
  printConsole('starting server...');

  let server = new grpc.Server();

  server.addService(proto.Hello.service, { sayHello: sayHello });
  server.addService(proto.Register.service, { tryRegister: tryRegister });
  server.addService(proto.Broadcast.service, { tryBroadcast: tryBroadcast });
  server.addService(proto.GetBlockchain.service, {
    askBlockchain: askBlockchain,
  });
  server.addService(proto.GetUnicoins.service, {
    numberOfUnicoins: numberOfUnicoins,
  });
  server.addService(proto.Exchange.service, { exchange: exchange });
  server.bind('0.0.0.0:' + utils.port, grpc.ServerCredentials.createInsecure());
  server.start();

  printConsole(`server started at (${utils.host}, ${utils.port})!`);

  setInterval(createBlock, 5000);
}

function generateHash() {
  let blockToHash = blockchain.slice(-1)[0];
  if (!blockToHash)
    blockToHash = {
      creator_host: 'creator_host',
      creator_port: 0,
      hash: 'hash',
      depth: 0,
      operations: [],
    };

  let blockHash = crypto
    .createHash('sha256')
    .update(blockToHash.creator_host)
    .update(Uint32Array.from([blockToHash.creator_port]))
    .update(blockToHash.hash)
    .update(Uint32Array.from([blockToHash.depth]));

  for (const op of blockToHash.operations) {
    blockHash.update(op.id);
    for (let i = 0; i < op.args.length; i++) {
      blockHash.update('' + op.args[i]);
    }
    blockHash.update('' + op.timestamp);
  }

  return blockHash.digest('hex');
}

/**
 * Creates a block
 * It contains MAX_OP operations or less and removes them from the waiting_list
 */
function createBlock() {
  waiting_list = waiting_list.filter(
    o => !isOperationInBlockchain(o.id, blockchain)
  );

  let block = {
    creator_host: utils.host,
    creator_port: parseInt(utils.port),
    hash: generateHash(),
    depth: blockchain.length + 1,
    operations: [],
  };

  let nb_op = waiting_list.length < MAX_OP ? waiting_list.length : MAX_OP;

  for (let i = 0; i < nb_op; i++) {
    block.operations.push(waiting_list[i]);
  }

  waiting_list.splice(0, nb_op);

  blockchain.push(block);
  displayBlockchain(blockchain);

  // then distribution of points depending on the participants merit
  nodeMembers.forEach(function(member) {
    waiting_list.push({
      id: uuidv4(),
      name: RECEIVED_UNICOINS,
      args: [
        `${member.host}:${member.port}`, // member who received unicoins
        `${member.merit}`,
      ], // number of unicoins received
      timestamp: Date.now(),
    });
  });

  shareWaitingList();

  let blockToBroadcast = new proto.Block();
  blockToBroadcast.set_hash(block.hash);
  blockToBroadcast.set_depth(block.depth);
  blockToBroadcast.set_operations(block.operations);
  blockToBroadcast.set_creator_host(block.creator_host);
  blockToBroadcast.set_creator_port(block.creator_port);

  broadcast({
    host: utils.host,
    port: parseInt(utils.port),
    type: 'block',
    block: blockToBroadcast,
  });
}

/**
 * Displays all participants of the node
 */
function displayParticipants() {
  for (const key of Object.keys(nodeMembers)) {
    printConsole(JSON.stringify(nodeMembers[key]));
  }
}

/**
 * Displays a blockchain
 * @param a_blockchain any part of a blockchain
 */
function displayBlockchain(a_blockchain) {
  printConsole(
    '┌─────────────────────────── [BLOCKCHAIN] ───────────────────────────┐'
  );
  for (const key of Object.keys(a_blockchain)) {
    let blockCreator = `${a_blockchain[key].creator_host}:${
      a_blockchain[key].creator_port
    }`;
    printConsole(`│ #${a_blockchain[key].hash}  │`);
    printConsole(
      `│ FROM: ${blockCreator} \t\t\t\t DEPTH: ${
        a_blockchain[key].depth
      }  \t     │`
    );
    printConsole(
      '│ OPERATIONS:                                                        │'
    );
    a_blockchain[key].operations.map(op => {
      printConsole(`│ \t - #${op.id} \t\t     │`);
      let opName = `│ \t       - type: ${op.name} `;
      let opArgs = `│ \t       - args: ${op.args} `;
      printConsole(`${opName + ' '.repeat(64 - opName.length)}│`);
      printConsole(`${opArgs + ' '.repeat(64 - opArgs.length)}│`);
    });
    printConsole(
      '├────────────────────────────────────────────────────────────────────┤'
    );
  }
  printConsole(
    '│                           END BLOCKCHAIN                           │'
  );
  printConsole(
    '└────────────────────────────────────────────────────────────────────┘'
  );
}

/**
 * Returns true if the operation is already in the blockchain
 * @param operation_id = unique uuid of the operation to search
 * @param a_blockchain = blockchain where we search the operation
 * @return bool
 */
function isOperationInBlockchain(operation_id, a_blockchain) {
  for (let i = 0; i < a_blockchain.length; i++) {
    const b = a_blockchain[i];
    for (let j = 0; j < b.operations.length; j++) {
      if (b.operations[j].id == operation_id) return true;
    }
  }

  return false;
}

/**
 * Returns the number of unicoins owned by a participant
 * @param blockchain where to search for the information
 * @param participant_host
 * @param participant_port
 * @return number of unicoins owned by the participant
 */
function ownedBy(a_blockchain, participant_host, participant_port) {
  let owned = 0;

  for (const key of Object.keys(a_blockchain)) {
    a_blockchain[key].operations.map(function(current) {
      if (current.args[0] === `${participant_host}:${participant_port}`) {
        if (current.name === RECEIVED_UNICOINS) {
          owned += parseFloat(current.args[1]);
        } else if (current.name === GAVE_UNICOINS) {
          owned -= parseFloat(current.args[1]);
        }
      }
    });
  }

  return owned;
}

/**
 * Broadcast the waiting_list to all neighbors
 */
function shareWaitingList() {
  let waiting = new proto.WaitingList();
  waiting.set_operations(waiting_list);

  broadcast({
    host: utils.host,
    port: parseInt(utils.port),
    type: 'waiting_list',
    waiting_list: waiting,
  });
}

/**
 * Broadcast a message to a list of neighbors
 * @param message message to broadcast
 */
function broadcast(message) {
  if (!message) return;
  if (!message.id) message.id = uuidv4();
  utils.markMessageAsTreated(message.id);
  for (let neighbor of neighbors) {
    printConsole(`[BROADCAST]\t${neighbor.host}:${neighbor.port}`);
    const client = new proto.Broadcast(
      `${neighbor.host}:${neighbor.port}`,
      grpc.credentials.createInsecure()
    );
    client.tryBroadcast(message, function(err, response) {
      if (err) {
        printConsole(
          `ERROR: cannot broadcast to ${neighbor.host}:${
            neighbor.port
          } (${err})`
        );
      }
    });
  }
}

/**********************/
/***SERVER FUNCTIONS***/
/**********************/

/**
 * When a server receive a greeting, it adds the sending node to its neighbors
 */
function sayHello(call, callback) {
  addNeighbor(call.request);
  callback(null, {
    host: utils.host,
    port: parseInt(utils.port),
  });
}

/**
 * When a server receive this call, it registers the participant who
 * send it, and then adds the operation to the waiting_list
 */
function tryRegister(call, callback) {
  printConsole('A participant wants to register.');

  // counts participants
  var nbMembers = 0;
  for (const key of Object.keys(nodeMembers)) {
    nbMembers++;

    if (
      nodeMembers[key].host == call.request.host &&
      nodeMembers[key].port == call.request.port
    ) {
      printConsole('The participant was already registered to this node.');
      callback(null, { accepted: false });
      return;
    }
  }

  var newMerit = 1 / (nbMembers + 1);

  nodeMembers[nbMembers + 1] = {
    host: call.request.host,
    port: call.request.port,
    merit: newMerit,
  };

  // each participant gets an equal merit
  for (const key of Object.keys(nodeMembers)) {
    nodeMembers[key].merit = newMerit;
  }

  printConsole(`participant registered:`);
  displayParticipants();
  callback(null, { accepted: true });

  waiting_list.push({
    id: uuidv4(),
    name: PARTICIPANT_REGISTERED,
    args: [
      `${call.request.host}:${call.request.port}`, // participant
      `${utils.host}:${utils.port}`, // node he registered to
    ],
    timestamp: Date.now(),
  });

  shareWaitingList();
}

/**
 * Reception of a broadcasted message, depending on its type
 * If it's a waiting_list, take the new informations only and then order it
 */
function tryBroadcast(call, callback) {
  if (utils.hasNotTreatedMessage(call.request.id)) {
    switch (call.request.type) {
      case 'text':
        printConsole(`GOT TEXT: ${call.request.text.str}`);
        break;

      case 'waiting_list':
        printConsole(
          `RECEIVED WAITING LIST: ${JSON.stringify(call.request.waiting_list)}`
        );

        call.request.waiting_list.operations.forEach(function(operation) {
          // the operation is not in our waiting_list
          if (
            waiting_list
              .map(function(e) {
                return e.id;
              })
              .indexOf(operation.id) == -1
          ) {
            // nor in the blockchain
            if (!isOperationInBlockchain(operation.id, blockchain)) {
              waiting_list.push(operation);
            }
          }
        });

        // order the local waiting_list
        waiting_list.sort(function(a, b) {
          if (a.timestamp < b.timestamp) return -1;
          if (b.timestamp < a.timestamp) return 1;
          return 0;
        });
        break;

      case 'block':
        printConsole(`RECEIVED BLOCK: ${JSON.stringify(call.request.block)}`);

        // in case the received block is too far in the future
        if (call.request.block.depth > blockchain.length + 1) {
          const askBlockchains = new proto.GetBlockchain(
            `${call.request.host}:${call.request.port}`,
            grpc.credentials.createInsecure()
          );
          printConsole(
            `Asking node's blockchain (${call.request.host}:${
              call.request.port
            })`
          );
          askBlockchains.askBlockchain(
            {
              depth: blockchain.length,
            },
            (err, response) => {
              if (err) {
                printConsole(err);
                printConsole(
                  `ERROR: cannot get ${call.request.host}:${
                    call.request.port
                  }'s  blockchain.`
                );
                return;
              } else {
                const res = response.block;
                if (res[0].depth === blockchain.length) {
                  if (res[0].hash === blockchain.slice(-1)[0].hash) {
                    for (let i = 1; i < res.length; i++) {
                      blockchain.push(res[i]);
                    }
                  } else {
                    // @TODO: if bad hash, remove all op and take the others
                  }
                }
              }
            }
          );
        } else if (call.request.block.depth <= blockchain.length) {
          // just ignore that block
        } else {
          // is the next block; verify if hash is OK and add to the chain
          verifyHash(call.request.block);
        }
        break;

      default:
        break;
    }

    broadcast(call.request);
  }

  callback(null, {});
}

function verifyHash(block) {
  if (block.depth === blockchain.length + 1) {
    let blockHash = generateHash();
    printConsole('HASH=' + blockHash + ', got ' + block.hash);
    // if (blockHash === block.hash) {
    blockchain.push(block);
    // }
  }
}

/**
 * Gives a node all blocks having depth >= call.request.depth
 */
function askBlockchain(call, callback) {
  printConsole(`asked blockchain with depth= ${call.request.depth}`);

  const blockchainToSend = blockchain.filter(
    b => b.depth >= call.request.depth
  );

  callback(null, blockchainToSend);
}

/**
 * Gives a participant the number of unicoins he owns
 */
function numberOfUnicoins(call, callback) {
  callback(null, {
    value: ownedBy(blockchain, call.request.host, call.request.port),
  });
}

/**
 * Launch an exchange between two participants
 */
function exchange(call, callback) {
  let accepted = true;

  printConsole(JSON.stringify(call.request));

  waiting_list.push(
    {
      id: uuidv4(),
      name: GAVE_UNICOINS,
      args: [
        `${call.request.sender.host}:${call.request.sender.port}`,
        `${call.request.unicoins.value}`,
      ],
      timestamp: Date.now(),
    },
    {
      id: uuidv4(),
      name: RECEIVED_UNICOINS,
      args: [
        `${call.request.receiver.host}:${call.request.receiver.port}`,
        `${call.request.unicoins.value}`,
      ],
      timestamp: Date.now(),
    }
  );

  shareWaitingList();

  callback(null, {
    accepted: accepted,
  });
}

/*************/
/***RUNNING***/
/*************/

// first, run the server
startServer();

// setInterval(() => {
//   printConsole(`neighbors: ${JSON.stringify(neighbors)}`);
//   broadcast({
//     'type': 'text',
//     'text': {
//           str: 'this is a test!!',
//         }
//   });
// }, 2000);

// then, greet the neighbor

let neighborsArgs = args.slice(2);

while (neighborsArgs.length >= 2) {
  const neighborHost = args[2];
  const neighborPort = parseInt(args[3]);
  const client = new proto.Hello(
    `${neighborHost}:${neighborPort}`,
    grpc.credentials.createInsecure()
  );
  printConsole(`Asking node's location (${neighborHost}:${neighborPort})`);
  client.sayHello(
    {
      host: utils.host,
      port: parseInt(utils.port),
    },
    (err, response) => {
      if (err) {
        printConsole(
          `ERROR: cannot add ${neighborHost}:${neighborPort} as neighbor.`
        );
        return;
      }
      if (response.host === neighborHost && response.port === neighborPort) {
        addNeighbor(response);
      }
      printConsole(`other node location: (${response.host}:${response.port})`);
    }
  );

  neighborsArgs = neighborsArgs.slice(2);

  // now asks for the neighbor's blockchain
  const askBlockchains = new proto.GetBlockchain(
    `${neighborHost}:${neighborPort}`,
    grpc.credentials.createInsecure()
  );
  printConsole(`Asking node's blockchain (${neighborHost}:${neighborPort})`);
  askBlockchains.askBlockchain(
    {
      depth: 1,
    },
    (err, response) => {
      if (err) {
        printConsole(err);
        printConsole(
          `ERROR: cannot get ${neighborHost}:${neighborPort}'s  blockchain.`
        );
        return;
      }
      const res = response.block;
      if (res.length > blockchain.length) {
        blockchain = res;
      }
      printConsole('Got blockchain\n => ' + JSON.stringify(response));
    }
  );
}
