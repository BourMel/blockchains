"use strict";

// require part
const grpc = require('grpc');

// init
const args = process.argv.slice(2);
const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;

if(args.length == 4) {

  const host = (args.length >= 1) ? args[0] : null;
  const port = (args.length >= 2) ? parseInt(args[1]) : null;
  const n_host = (args.length >= 2) ? args[2] : null;
  const n_port = (args.length >= 2) ? parseInt(args[3]) : null;


  console.log(`nodeMember ${host}:${port} trying to register to ${n_host}:${n_port}...`);

  let node = new proto.Register(n_host + ':' + n_port, grpc.credentials.createInsecure());

  node.tryRegister({host: host, port: port}, function(err, response) {
    console.log('Registration accepted: ' + response.accepted);
  });

} else {
  console.log(`USAGE : [participant_host] [participant_port] [node_host] [node_port]`);
}

//échanges à intervalles (réguliers au début),
//puis demander au noeud bloc combien d'argent on possède pour affichage
