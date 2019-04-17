const express = require('express')
const fs = require('fs')
const path = require('path')
var recursive = require('recursive-readdir') //https://github.com/jergason/recursive-readdir
const app = express()
var settings = require('./app-settings.json');
var constants = require('./constants.json');

//TODO: Test
const Filehound = require('filehound');

app.use(express.static(path.join(__dirname, 'public')))

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.htm'))
})

// Return video
app.get('/video', function (req, res) {
    // video file's path comes from url parameter "video", i.e. /video?video=C:\video.mp4
    const path = req.query.video;
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ?
            parseInt(parts[1], 10) :
            fileSize - 1

        const chunksize = (end - start) + 1
        const file = fs.createReadStream(path, {
            start,
            end
        })
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        }

        res.writeHead(206, head)
        file.pipe(res)
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
    }
})

app.get('/dirs', function (req, res) {

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    const dir = constants.dir;
    const dir2 = constants.dir2;
    const dirLinux = constants.dirLinux;
    // Base directory's path comes from url parameter "base", i.e. /dirs?base=\media
    const baseDir = req.query.base;
    console.log(baseDir);
    var dirArray = [];

    //If basedir is missing from URL

    if (baseDir == undefined) {
        res.json({
            err: 'Base directory not set'
        });
    }
    // List all folders inside base directory and return as JSON object

    const dirs = Filehound.create()
        .path(baseDir)
        .depth(0)
        .directory()

    const result = dirs.findSync();
    console.log('/dirs: ', result);
    result.map(dir => {
        dirArray.push(dir)
    });

    // Get the number of folders found
    var foldersArrayLength = dirArray.length;

    // Generate response object
    var response = {
        listLength: foldersArrayLength,
        list: dirArray
    }

    res.json(response);

});

app.get('/files', function (req, res) {

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    var filesArray = [];
    // directory's path comes from url parameter "dir", i.e. /files?dir=\media\videos
    const dir = req.query.dir;

    // If directory is not set by URL
    if (dir == undefined) {
        res.json({
            err: 'Directory not set'
        });
    }

    // Get list of files from directory
    const files = Filehound.create()
        .path(dir)
        .depth(0)
    //.ext(".mp4")


    const result = files.findSync();
    console.log('files path: ', dir);
    console.log('/files: ', result);
    result.map(file => {
        filesArray.push(file)
    });

    // Get the number of files found
    var filesArrayLength = filesArray.length;

    // Generate response object
    var response = {
        listLength: filesArrayLength,
        list: filesArray
    }

    res(response);

})

app.get('/settings', function (req, res) {
    // Get the user's settings object from global settings file
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    settings


    res.json(settings);

})

app.put('/settings', function (req, res) {
    // Update user's settings in global settings file
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    // settings keys and values comes from url parameters, i.e. /settings?baseDir=\media\videos
    const baseDir = req.query.baseDir || settings.baseDir;

    // Update settings object
    settings.baseDir = baseDir;

    // Write settings object to a file
    var file = fs.open("app-settings.json", "w", function (err, fd) {
        if (err) {
            console.error(err)
        }

        fs.write(fd, JSON.stringify(settings), function (err, written, string) {
            if (err) {
                console.error("Error while writing to file: ", err)
                res.json({
                    err: "Error saving settings"
                })
            }
            res.json(settings);
        });
    });


})

app.listen(3000, function () {
    console.log('Listening on port 3000!')
})