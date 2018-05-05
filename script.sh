#!/bin/sh

node node.js localhost 1234&
NODE1=$!

sleep 5

node node.js localhost 1235 localhost 1234&
NODE2=$!

node nodeMember.js localhost 1242 localhost 1234
node nodeMember.js localhost 1243 localhost 1234
node nodeMember.js localhost 1244 localhost 1234
node nodeMember.js localhost 1245 localhost 1234
node nodeMember.js localhost 1246 localhost 1234

sleep 20

kill $NODE1
kill $NODE2
