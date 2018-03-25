var grpc = require('grpc');

const HOST = 'localhost';
const PORT = '50051';
const PROTO_PATH = __dirname + '/messages.proto';
const NODE_ID = 103;

/****************/
/***Block Node***/
/****************/
var proto = grpc.load(PROTO_PATH).protocol;

function main() {
  console.log('Serveur lancé');

  var server = new grpc.Server();

  console.log(`my id is : ${NODE_ID}`);

  server.addService(proto.Hello.service, {sayHello: sayHello});
  server.bind('0.0.0.0:' + PORT, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log('Serveur attend');
}

/*********************************/
/***RPC methods implementations***/
/*********************************/

function sayHello(call, callback) {
  console.log(`sending my id`);

  callback(null, {id: NODE_ID});
}

main();
