// require part
const grpc = require('grpc');

// init
const args = process.argv.slice(2);
const host = (args.length >= 1) ? args[0] : 'localhost';
const port = (args.length >= 2) ? args[1] : Math.floor(Math.random() * 100) + 50000;
const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;

// server part of the node
function startServer() {
  console.log('starting server...');
  let server = new grpc.Server();
  console.log(`my id is : ${port}`);
  server.addService(proto.Hello.service, {sayHello: sayHello});
  server.bind('0.0.0.0:' + port, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log(`server started at (${host}, ${port})!`);
}

// function used by the server to answer other nodes requests
function sayHello(call, callback) {
  console.log('sending my id');
  callback(null, {id: port});
}

startServer();