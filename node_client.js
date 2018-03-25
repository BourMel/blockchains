var grpc = require('grpc');

const HOST = 'localhost';
const PORT = '50051';
const PROTO_PATH = __dirname + '/messages.proto';
const NODE_ID = 42;

/****************/
/***Block Node***/
/****************/

var proto = grpc.load(PROTO_PATH).protocol;

function main() {
  console.log('Client lancé');

  var client = new proto.Hello(HOST + ':' + PORT, grpc.credentials.createInsecure());

  console.log('Asking the node\'s id');

  client.sayHello({id: NODE_ID}, function(err, response) {
    console.log('Other Node Id:', response.id);
  });

  console.log('Fin client');
}

main();
