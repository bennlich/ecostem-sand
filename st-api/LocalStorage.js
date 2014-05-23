
export class LocalStorage {
    constructor() {
        this.filer = new Filer();
    }

    filerOnError(e) {
        console.log('Filer Error: ', e.name);
    }

    initialized(callback) {
        var filer = this.filer,
            filerOnError = this.filerOnError;

        filer.init({persistent: false, size: 1024*1024*20}, function() {
            callback(filer);
        }, filerOnError);
    }

    withDir(dir, callback) {
        this.initialized(function(filer) {
            filer.ls(dir, function() {
                console.log('found dir', dir);
                callback(dir);
            }, function() {
                console.log('creating dir', dir);
                filer.mkdir(dir);
                callback(dir);
            });
        });
    }

    dirGetFile(dir, fileName, successCallback, notFoundCallback) {
        this.initialized(function(filer) {
            filer.ls(dir, function(contents) {
                var cachedFile = _.find(contents, function(c) {
                    return c.isFile && c.name === fileName;
                });

                if (cachedFile) {
                    console.log('found file', dir, cachedFile.name);
                    successCallback(cachedFile);
                } else {
                    console.log('file not found', dir, fileName);
                    notFoundCallback();
                }
            });
        });
    }

    readFileAsByteArray(fileObj, callback) {
        var filerOnError = this.filerOnError;

        this.initialized(function(filer) {
            filer.open(fileObj.fullPath, function(file) {
                var reader = new FileReader();
                reader.onload = function() {
                    callback(new Uint8Array(reader.result));
                };
                reader.readAsArrayBuffer(file);
            }, filerOnError);
        });
    }

    writeFile(filePath, data, callback) {
        var filerOnError = filerOnError;

        this.initialized(function(filer) {
            filer.write(filePath, {data: data}, callback);
        }, filerOnError);
    }
}
