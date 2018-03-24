var grpc = require('grpc');

const HOST = 'localhost';
const PORT = '50051';
const PROTO_PATH = __dirname + '/messages.proto';

/****************/
/***Block Node***/
/****************/
var proto = grpc.load(PROTO_PATH).protocol;

function main() {
  console.log('Serveur lancé');

  var server = new grpc.Server();

  server.addService(proto.Hello.service, {sayHello: sayHello});
  server.bind('0.0.0.0:' + PORT, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log('Fin serveur');
}

/*********************************/
/***RPC methods implementations***/
/*********************************/

function sayHello(call, callback) {
  callback(null, {id: 103});
}

main();
