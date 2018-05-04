"use strict";

// require part
const utils = require('./includes/utils');
const grpc = require('grpc');
const uuidv4 = require('uuid/v4');

// init
const MAX_OP = 4;

const args = process.argv.slice(2);
utils.initHostPort(args);

const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;
const neighbors = [];
let blockchain = [];
const unsaved_op = [];

//should be empty when launched (filled for test purposes)
var nodeMembers = [
  // {host: 'localhost', port: '50008', merit: 0.5},
  // {host: 'localhost', port: '50007', merit: 0.5}
];

function printConsole(msg) {
  console.log(`[${utils.host}:${utils.port}]\t${msg}`);
}

function addNeighbor(neighbor) {
  if (!utils.hasObject(neighbors, neighbor)) {
    printConsole(`new neighbor: ${JSON.stringify(neighbor)}`);
    neighbors.push(neighbor);
  }
}

/***************/
/***FUNCTIONS***/
/***************/

// server part of the node
function startServer() {
  "use strict";
  printConsole('starting server...');

  let server = new grpc.Server();

  server.addService(proto.Hello.service, {sayHello: sayHello});
  server.addService(proto.Register.service, {tryRegister: tryRegister});
  server.addService(proto.Broadcast.service, {tryBroadcast: tryBroadcast});
  server.addService(proto.GetBlockchain.service, {askBlockchain: askBlockchain});
  server.bind('0.0.0.0:' + utils.port, grpc.ServerCredentials.createInsecure());
  server.start();

  printConsole(`server started at (${utils.host}, ${utils.port})!`);

  setInterval(createBlock, 10000);
}

function createBlock() {
    let block = {
      creator_host: utils.host,
      creator_port: parseInt(utils.port),
      hash: "thisIsNotAHash", //@TODO
      depth: blockchain.length + 1,
      operations: []
    }

    let nb_op = unsaved_op.length < MAX_OP ? unsaved_op.length : MAX_OP;

    for(let i=0; i<nb_op; i++) {
      block.operations.push(unsaved_op[i]);
    }

    unsaved_op.splice(0, nb_op);

    blockchain.push(block);
    displayBlockchain(blockchain);
}

function displayParticipants() { //@TODO
  for(const key of Object.keys(nodeMembers)) {
    printConsole(nodeMembers[key]);
  }
}

function displayBlockchain(a_blockchain) {
  printConsole('______________________BLOCKCHAIN______________________');
  for(const key of Object.keys(a_blockchain)) {
    printConsole('[ creator:' + a_blockchain[key].creator_host + ':' + a_blockchain[key].creator_port);
    printConsole('  hash: ' + a_blockchain[key].hash);
    printConsole('  depth: ' + a_blockchain[key].depth + ' | operations :');
    a_blockchain[key].operations.map(function(current) {
      printConsole('[ ' + current.id + ' | ' + current.name + ' ]');
    });
    printConsole('_______________________________________________________');
  }
  printConsole('______________________END_BLOCKCHAIN______________________');
}

/**********************/
/***SERVER FUNCTIONS***/
/**********************/

// function used by the server to answer other nodes requests
function sayHello(call, callback) {
  addNeighbor(call.request);
  callback(null, {
    'host': utils.host,
    'port': parseInt(utils.port)
  });
}

function tryRegister(call, callback) {
  printConsole('A participant wants to register. Our participants now :');
  displayParticipants();

  //counts participants
  var nbMembers = 0;
  for(const key of Object.keys(nodeMembers)) {
    nbMembers++;

    if((nodeMembers[key].host == call.request.host)
    && (nodeMembers[key].port == call.request.port)) {
      printConsole('The participant was already registered to this node.');
      callback(null, {accepted: false});
      return;
    }
  }

  var newMerit = 1/(nbMembers+1);

  nodeMembers[nbMembers+1] = {
    host: call.request.host,
    port: call.request.port,
    merit: newMerit
  };

  //each participant gets an equal merit
  for(const key of Object.keys(nodeMembers)) {
    nodeMembers[key].merit = newMerit;
  }

  printConsole(`participant registered`);
  displayParticipants();
  callback(null, {accepted: true});

  unsaved_op.push({
    id: uuidv4(),
    name: 'participant_registered',
    args: [
      `${call.request.host}:${call.request.port}`, //participant
      `${utils.host}:${utils.port}` //node he registered to
    ]
  });
}

function tryBroadcast(call, callback) {
  printConsole(`GOT MSG: ${call.request.str}`);
  callback(null, {});
}

function askBlockchain(call, callback) {
  printConsole(`got something : ${call.request}`);
  callback(null, blockchain);
}

/*************/
/***RUNNING***/
/*************/

// first, run the server
startServer();
setInterval(() => {
  printConsole(`neighbors: ${JSON.stringify(neighbors)}`);
  broadcast();
}, 2000);

// then, greet the neighbor

let neighborsArgs = args.slice(2);

while (neighborsArgs.length >= 2) {
  const neighborHost = args[2];
  const neighborPort = parseInt(args[3]);
  const client = new proto.Hello(`${neighborHost}:${neighborPort}`, grpc.credentials.createInsecure());
  printConsole(`Asking node's location (${neighborHost}:${neighborPort})`);
  client.sayHello({
    'host': utils.host,
    'port': parseInt(utils.port)
  }, function(err, response) {
    if (err) {
      printConsole(`ERROR: cannot add ${neighborHost}:${neighborPort} as neighbor.`);
      return;
    }
    if (response.host === neighborHost && response.port === neighborPort) {
      addNeighbor(response);
    }
    printConsole(`other node location: (${response.host}:${response.port})`);
  });
  printConsole('call ended');
  neighborsArgs = neighborsArgs.slice(2);


  const askBlockchains = new proto.GetBlockchain(`${neighborHost}:${neighborPort}`, grpc.credentials.createInsecure());
  printConsole(`Asking node's blockchain (${neighborHost}:${neighborPort})`);
  askBlockchains.askBlockchain({
    depth: 1
  }, function (err, response) {
    if (err) {
      printConsole(err);
      printConsole(`ERROR: cannot get ${neighborHost}:${neighborPort}'s  blockchain.`);
      return;
    }
    const res = response.block;
    if (res.length > blockchain.length) {
      blockchain = res;
    }
    printConsole('Got blockchain\n => ' + JSON.stringify(response));
  });
}


function broadcast() {
  for (let neighbor of neighbors) {
    printConsole(`[BROADCAST]\t${neighbor.host}:${neighbor.port}`);
    const client = new proto.Broadcast(`${neighbor.host}:${neighbor.port}`, grpc.credentials.createInsecure());
    client.tryBroadcast({
      'type': 'str',
      'str': 'this is a test!!'
    }, function (err, response) {
      if (err) {
        printConsole(`ERROR: cannot broadcast to ${neighbor.host}:${neighbor.port} (${err})`);
      }
    });
  }
}
