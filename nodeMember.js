"use strict";

// require part
const grpc = require('grpc');

// init
const args = process.argv.slice(2);
const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;

if(args.length >= 3) {
  console.log(`nodeMember ${args[0]} trying to register to ${args[1]} : ${args[2]}...`);

  let node = new proto.Register(args[1] + ':' + args[2], grpc.credentials.createInsecure());

  node.tryRegister({id: parseInt(args[0])}, function(err, response) {
    console.log('Registration accepted:' + response); //@TODO : récupérer l'état true/false
    console.log('End');
  });

} else {
  console.log(`USAGE : [my_id] [host] [port]`);
}
