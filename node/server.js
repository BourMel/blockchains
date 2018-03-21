var grpc = require('grpc');
import { HOST, PORT, PROTO_PATH } from './constants.js';

/****************/
/***Block Node***/
/****************/
var proto = grpc.load(PROTO_PATH).protocol;

function main() {
  console.log('Client lancé');

  var server = new grpc.Server();

  server.addService(proto.Hello.service, {sayHello: sayHello});
  server.bind('0.0.0.0:' + PORT, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log('Client finit');
}

/*********************************/
/***RPC methods implementations***/
/*********************************/

function sayHello(call, callback) {
  callback(null, {id: 103});
}

main();
