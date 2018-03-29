"use strict";

// require part
const grpc = require('grpc');

// init
const args = process.argv.slice(2);
const host = (args.length >= 1) ? args[0] : 'localhost';
const port = (args.length >= 2) ? args[1] : Math.floor(Math.random() * 100) + 50000;
const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;

//should be empty when launched (filled for test purposes)
var nodeMembers = {
  1: {host: 'localhost', port: '50008', merit: 0.5},
  2: {host: 'localhost', port: '50007', merit: 0.5}
};

/***************/
/***FUNCTIONS***/
/***************/

// server part of the node
function startServer() {
  "use strict";
  console.log('starting server...');

  let server = new grpc.Server();

  server.addService(proto.Hello.service, {sayHello: sayHello});
  server.addService(proto.Register.service, {tryRegister: tryRegister});
  server.bind('0.0.0.0:' + port, grpc.ServerCredentials.createInsecure());
  server.start();

  console.log(`server started at (${host}, ${port})! id : ${port}`);
}

function displayParticipants() {
  for(const key of Object.keys(nodeMembers)) {
    console.log(nodeMembers[key]);
  }
}

/**********************/
/***SERVER FUNCTIONS***/
/**********************/

// function used by the server to answer other nodes requests
function sayHello(call, callback) {
  console.log('sending my id');
  callback(null, {id: port});
}

function tryRegister(call, callback) {
  console.log('A participant wants to register. Our participants now :');
  displayParticipants();

  //counts participants
  var nbMembers = 0;
  for(const key of Object.keys(nodeMembers)) {
    nbMembers++;
  }

  var newMerit = 1/(nbMembers+1);

  nodeMembers[nbMembers+1] = {
    host: 'localhost',
    port: 50000, //@TODO : le participant n'envoie que son id pour l'instant. + comment récupérer
    merit: newMerit
  };

  //each participant gets an equal merit
  for(const key of Object.keys(nodeMembers)) {
    nodeMembers[key].merit = newMerit;
  }

  console.log(`participant registered`);
  displayParticipants();
  callback(null, {registered: true});
}

/*************/
/***RUNNING***/
/*************/

// first, run the server
startServer();

// then, greet the neighbor
if (args.length >= 4) {
  let client = new proto.Hello(args[2] + ':' + args[3], grpc.credentials.createInsecure());
  console.log(`Asking node's id (${args[2]}, ${args[3]})`);
  client.sayHello({id: 42}, function(err, response) {
    console.log('Other Node Id:', response.id);
  });
  console.log('call ended');
}
