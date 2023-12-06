#! /usr/bin/env node
 // see https://github.com/tmalbonph/js-sdk-canvas/blob/main/LICENSE
const fs = require('fs');
const express = require('express');
const app = express();

const HTTP_PORT = 3000;
const HOME_PAGE = 'canvas-demo.html';
const TARGET_HTML_FILE = './html/' + HOME_PAGE;
const HTTP_ADDRESS = 'http://localhost:' + HTTP_PORT + '/';
const REDIRECT_TO = HTTP_ADDRESS + HOME_PAGE;
const USE_REDIRECT = false;

const THIS_VERSION = '1.0.1';
const ROUTE_JS_FILE = '/js/js-sdk-canvas-' + THIS_VERSION + '.js';
const TARGET_JS_FILE = '.' + ROUTE_JS_FILE;

// Try to check if running in Machintosh (probably macBook???)
function detect_mac(onError) {
    fs.access('/Applications/Utilities/.localized', fs.constants.R_OK, function(err) {
        if (err) {
            fs.access('/Applications/.DS_Store', fs.constants.R_OK, function(err) {
                if (!err) {
                    onError(null);
                } else {
                    onError(err);
                }
            });
        } else {
            onError(null);
        }
    });
}

function bufferToString(size, buffer) {
    let data = buffer.toString();
    return data.slice(0, size);
}

function sendNotFound(res, _path) {
    let html = `\n\
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">\n\
<html lang="en">\n\
<!-- Copyright (c) 2023 albonteddy at gmail dot com. All rights reserved. -->\n\
    <head>\n\
        <meta http-equiv="content-type" content="text/html; charset=windows-1252">\n\
        <title>Resource or Page not found</title>\n\
    </head>\n\
    <body style="color:#000;margin:32px 32px 32px 32px;"><center>\n\
        <p style="font-size:48px;">Resource or Page not found</p>\n\
        <p style="font-size:16px;">The resource or page your looking for <span style="color:#ff0000;">does not exist</span> on resource path &lt;<span style="color:#ff0000;">${_path}</span>&gt; on this server.</p></center>\n\
    </body>\n\
</html>\n\n`;
    res.type('html')
        .set('Content-Type', 'text/html')
        .status(404).send(bufferToString(html.length, html))
        .end();
}

function handleOpenFile(_this, fileName, _type, _contentType, res, err, buffer) {
    if (err) {
        sendNotFound(res, fileName);
    } else {
        let size = buffer.length;
        switch (_type) {
            case 'html':
            case 'js':
            case 'text':
            case 'css':
                res.type(_type)
                    .set('Content-Type', _contentType)
                    .status(200).send(bufferToString(size, buffer))
                    .end();
                break;
            case 'json':
            default:
                res.type(_type)
                    .set('Content-Type', _contentType)
                    .status(200).json(bufferToString(size, buffer))
                    .end();
                break;
        }
    }
}

function readCanvasHtmlFile(_this, res) {
    const local_file = TARGET_HTML_FILE;
    fs.readFile(local_file, 'utf-8', (err, data) => {
        handleOpenFile(_this, local_file, 'html', 'text/html', res, err, data);
    });
}

function readCanvasSdkFile(_this, res) {
    const local_file = TARGET_JS_FILE;
    fs.readFile(local_file, 'utf-8', (err, data) => {
        handleOpenFile(_this, local_file, 'js', 'application/javascript', res, err, data);
    });
}

app.get('/', (req, res) => {
    if (USE_REDIRECT) {
        res.redirect(301, REDIRECT_TO);
    } else {
        readCanvasHtmlFile(this, res);
    }
});

app.get('/index.html', (req, res) => {
    if (USE_REDIRECT) {
        res.redirect(301, REDIRECT_TO);
    } else {
        readCanvasHtmlFile(this, res);
    }
});

app.get('/canvas-demo.html', (req, res) => {
    readCanvasHtmlFile(this, res);
});

app.get('/js/js-sdk-canvas.js', (req, res) => {
    readCanvasSdkFile(this, res);
});

app.get('/js/js-sdk-canvas-1.0.1.js', (req, res) => {
    readCanvasSdkFile(this, res);
});

app.use('/*', (req, res) => {
    sendNotFound(res, req.originalUrl);
});

app.listen(HTTP_PORT, () => {
    detect_mac(function(err) {
        let msg = err ? 'Ctrl-C' : 'control+C';
        console.log(`Demo server started on port ${HTTP_PORT}\n\
To see the demo, Open: ${REDIRECT_TO}\n\
Or press ${msg} to quit.\n`);
    });

});