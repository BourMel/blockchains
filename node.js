"use strict";

// require part
const grpc = require('grpc');

// init
const args = process.argv.slice(2);
const host = (args.length >= 1) ? args[0] : 'localhost';
const port = (args.length >= 2) ? args[1] : Math.floor(Math.random() * 100) + 50000;
const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;
const neighbors = [];
const blockchain = [];

//should be empty when launched (filled for test purposes)
var nodeMembers = [
  {host: 'localhost', port: '50008', merit: 0.5},
  {host: 'localhost', port: '50007', merit: 0.5}
];


function printConsole(msg) {
  console.log(`[${host}:${port}]\t${msg}`);
}

function addNeighbor(neighbor) {
  if (!neighbors.includes(neighbor)) {
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
  server.bind('0.0.0.0:' + port, grpc.ServerCredentials.createInsecure());
  server.start();

  printConsole(`server started at (${host}, ${port})! id : ${port}`);

  setInterval(function(){createBlock();}, 10000);
}

function createBlock() {
  let block = {
    creator: {host: host, port: port},
    hash: "thisIsNotAHash", //@TODO
    depth: blockchain.length + 1,
    operations: {} //@TODO
  }

  blockchain.push(block);
  displayBlockchain(blockchain);
}

function displayParticipants() {
  for(const key of Object.keys(nodeMembers)) {
    printConsole(nodeMembers[key]);
  }
}

function displayBlockchain(a_blockchain) {
  printConsole('______________________BLOCKCHAIN______________________');
  for(const key of Object.keys(a_blockchain)) {
    printConsole('[ creator:' + a_blockchain[key].creator.host + ':' + a_blockchain[key].creator.port);
    printConsole('  hash: ' + a_blockchain[key].hash);
    printConsole('  depth: ' + a_blockchain[key].depth + ' ]');
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
    'host': host,
    'port': parseInt(port)
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
}

/*************/
/***RUNNING***/
/*************/

// first, run the server
startServer();
setInterval(() => {
  printConsole(`neighbors: ${JSON.stringify(neighbors)}`);
}, 2000);

// then, greet the neighbor

let neighborsArgs = args.slice(2);

while (neighborsArgs.length >= 2) {
  const neighborHost = args[2];
  const neighborPort = parseInt(args[3]);
  const client = new proto.Hello(`${neighborHost}:${neighborPort}`, grpc.credentials.createInsecure());
  printConsole(`Asking node's location (${neighborHost}:${neighborPort})`);
  client.sayHello({
    'host': host,
    'port': parseInt(port)
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
}
