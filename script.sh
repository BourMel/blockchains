#!/bin/sh

node node.js localhost 1234&
NODE1=$!

sleep 5

node node.js localhost 1235 localhost 1234&
NODE2=$!

sleep 20

kill $NODE1
kill $NODE2

