var grpc = require('grpc');

const HOST = 'localhost';
const PORT = '50051';
const PROTO_PATH = __dirname + '/messages.proto';

/****************/
/***Block Node***/
/****************/

var proto = grpc.load(PROTO_PATH).protocol;

function main() {
  console.log('Client lancé');

  var client = new proto.Hello(HOST + ':' + PORT, grpc.credentials.createInsecure());

  client.sayHello({id: 42}, function(err, response) {
    console.log('Id:', response.message);
  });

  console.log('Fin client');
}

main();
