'use strict';

/*************/
/***IMPORTS***/
/*************/
const grpc = require('grpc');

/********************/
/***INITIALISATION***/
/********************/
const args = process.argv.slice(2);
const protoPath = `${__dirname}/messages.proto`;
const proto = grpc.load(protoPath).protocol;

/***********/
/***START***/
/***********/
if (args.length == 4) {
  const host = args.length >= 1 ? args[0] : null;
  const port = args.length >= 2 ? parseInt(args[1]) : null;
  const n_host = args.length >= 2 ? args[2] : null;
  const n_port = args.length >= 2 ? parseInt(args[3]) : null;

  console.log(
    `nodeMember ${host}:${port} trying to register to ${n_host}:${n_port}...`
  );

  let node = new proto.Register(
    n_host + ':' + n_port,
    grpc.credentials.createInsecure()
  );

  node.tryRegister({ host: host, port: port }, function(err, response) {
    console.log('Registration accepted: ' + response.accepted);
  });

  setInterval(() => {
    askUnicoins(n_host, n_port, host, port);
  }, 2000);
} else {
  console.log(
    `USAGE : [participant_host] [participant_port] [node_host] [node_port]`
  );
}

/***************/
/***FUNCTIONS***/
/***************/

/**
 * Ask Unicoins owned by this participant
 * @param n_host node host
 * @param n_port node port
 * @param host participant host
 * @param port participant port
 */
function askUnicoins(n_host, n_port, host, port) {
  let nodeUni = new proto.GetUnicoins(
    n_host + ':' + n_port,
    grpc.credentials.createInsecure()
  );

  nodeUni.numberOfUnicoins({ host: host, port: port }, function(err, response) {
    console.log('Number of Unicoins owned: ' + response.value.toFixed(2) + ' 🦄');
  });
}

//échanges à intervalles (réguliers au début),
//puis demander au noeud bloc combien d'argent on possède pour affichage
