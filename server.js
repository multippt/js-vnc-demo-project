'use strict';

var RFB = require('rfb2');
var io = require('socket.io');
var jpeg = require('jpeg-js');
var bmp = require('bmp-js');
var express = require('express');
var http = require('http');
var clients = [];
var Config = {
    HTTP_PORT: 8090
};

function encodeFrame(rect) {
    var rgb = new Buffer(rect.width * rect.height * 4, 'binary');
    var offset = 0;
    var fb = rect.data;
    if (fb == null) {
        forceRefresh = true;
        return null;
    }
    var compress = false;
    if (rect.width * rect.height > 10000) {
        compress = true;
    }

    for (var i = 0; i < fb.length; i += 4) {
        rgb[offset] = fb[i + 2];
        offset += 1;
        rgb[offset] = fb[i + 1];
        offset += 1;
        rgb[offset] = fb[i];
        offset += 1;
        rgb[offset] = 0xFF;
        offset += 1;
    }

    var imgData = {
        data: rgb,
        width: rect.width,
        height: rect.height,
    }
    if (compress) {
        return jpeg.encode(imgData, 50).data;
    } else {
        return bmp.encode(imgData).data;
    }
}

var forceRefresh = false;

function addEventHandlers(r, socket) {
    var initialized = false;
    var screenWidth;
    var screenHeight;

    function handleConnection(width, height) {
        screenWidth = width;
        screenHeight = height;
        console.info('RFB connection established');
        socket.emit('init', {
            width: width,
            height: height
        });
        clients.push({
            socket: socket,
            rfb: r,
            interval: setInterval(function() {
                    r.requestUpdate(!forceRefresh, 0, 0, r.width, r.height);
                    forceRefresh = false;
                }, 2000) // Full-redraw
        });
        r.requestUpdate(false, 0, 0, r.width, r.height);
        initialized = true;
    }

    r.on('error', function(e) {
        console.error('Error while talking with the remote RFB server', e);
    });

    r.on('rect', function(rect) {
        if (!initialized) {
            handleConnection(rect.width, rect.height);
        }

        var data = encodeFrame(rect);
        if (data) {
            socket.emit('frame', {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                image: data.toString('base64')
            });
        }

        r.requestUpdate(true, 0, 0, r.width, r.height);
    });

    r.on('*', function() {
        console.error(arguments);
    });
}

function createRfbConnection(config, socket) {
    var r;
    try {
        //r = RFB({
        r = RFB.createConnection({
            host: config.host,
            port: config.port,
            password: config.password,
            securityType: 'vnc',
        });
        setTimeout(function() {
            r.requestUpdate(false, 0, 0, r.width, r.height);
        }, 200);
    } catch (e) {
        console.log(e);
    }
    addEventHandlers(r, socket);
    return r;
}

function disconnectClient(socket) {
    clients.forEach(function(client) {
        if (client.socket === socket) {
            client.rfb.end();
            clearInterval(client.interval);
        }
    });
    clients = clients.filter(function(client) {
        return client.socket === socket;
    });
}

(function() {
    var app = express();
    var server = http.createServer(app);

    app.use(express.static(__dirname + '/static/'));
    server.listen(Config.HTTP_PORT);

    console.log('Listening on port', Config.HTTP_PORT);

    io = io.listen(server, {
        log: false
    });
    io.sockets.on('connection', function(socket) {
        console.info('Client connected');
        socket.on('init', function(config) {
            var r = createRfbConnection(config, socket);
            socket.on('mouse', function(evnt) {
                r.pointerEvent(evnt.x, evnt.y, evnt.button);
            });
            socket.on('keyboard', function(evnt) {
                r.keyEvent(evnt.keyCode, evnt.isDown);
                console.info('Keyboard input');
            });
            socket.on('disconnect', function() {
                disconnectClient(socket);
                console.info('Client disconnected');
            });
        });
    });
}());