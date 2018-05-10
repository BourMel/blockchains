#!/bin/sh

node node.js localhost 1234&
NODE1=$!

sleep 1

node node.js localhost 1235 localhost 1234&
NODE2=$!

sleep 1

node nodeMember.js localhost 1241 localhost 1234&
NODEMEMBER1=$!
node nodeMember.js localhost 1242 localhost 1234&
NODEMEMBER2=$!
node nodeMember.js localhost 1243 localhost 1234&
NODEMEMBER3=$!
node nodeMember.js localhost 1244 localhost 1234&
NODEMEMBER4=$!
node nodeMember.js localhost 1245 localhost 1234&
NODEMEMBER5=$!
node nodeMember.js localhost 1246 localhost 1234&
NODEMEMBER6=$!

sleep 20

kill $NODE1
kill $NODE2

kill $NODEMEMBER1
kill $NODEMEMBER2
kill $NODEMEMBER3
kill $NODEMEMBER4
kill $NODEMEMBER5
kill $NODEMEMBER6
