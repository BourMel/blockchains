Blockchain
==========

> A project built using NodeJS and grpc

## Getting started

Make sure you have the last version of NodeJS installed on your system.

Install all required dependencies using `npm install`.

To start a block, you can use: `node node.js`. It will start a node on localhost and on a random port.

If you'd rather start it on a specific host:port couple, just use
`node node.js localhost 1234` if you want to start it on localhost:1234.

You can also pass other host:port couples in args; they will be the neighbors the node will try to connect with. For example, if you run
`node node.js localhost 1236 localhost 1234 localhost 1235`, it will create a node on localhost:1236 that will have two neighbors: localhost:1234 and localhost:1235.

You can start a node member that will be registered to a node using
`node nodeMember.js localhost 1241 localhost 1234`; in this example, a node member will be started on localhost:1241 and will register to the node localhost:1234.

You can also make some transactions using `node exchange.js localhost 1234 localhost 1241 localhost 1242 0.1`.
In this example, it will contact the node localhost:1234, so that it will create an operation in his waiting list. This operation will say that localhost:1241 wants to give 0.1 Unicoin (the name of our blockchain money) to the node member localhost:1242. The transaction will be confirmed when it will be written on one block of the blockchain. The transaction is possible only if the node member
has enough money.

We wrote a small shell-script that will start a small scenario.
First, it will create two nodes which will be connected together as neighbors, then we register five members to the first node, and one to the other node.
After a few seconds, it will make two transactions, and start a third node.

If you want to see the expected results of this script (that you can start using `./script.sh`), you can watch the video here:
https://www.youtube.com/watch?v=ErvVE9flARA.

If one node receives a block too far in the future, it will ask the sender for the missing blocks. When a node receives a block, it will check the deep and the hash; if the hash is wrong, it will remove some blocks from the blockchain, add all operations of removed blocks in the waiting_list again, and ask for
blocks from the sender in order to repair the blockchain.

Our blockchain has a protection so that it cannot have infinite loops of broadcasted messages.
