var grpc = require('grpc');
import { HOST, PORT, PROTO_PATH } from './constants.js';

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

  console.log('Client finit');
}

main();
