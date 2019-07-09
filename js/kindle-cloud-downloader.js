'use strict';

window.kindleCloudDownloader = window.kindleCloudDownloader || {};

function fetchDataURLs() {
    return new Promise(function(resolve, reject) {
        let db = openDatabase('K4Wbooks', '7', 'K4Wbooks', 0);

        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM resources', [], function(tx, results) {
                let urls = [];

                for (let i = 0; i < results.rows.length; i++) {
                    let payload = results.rows.item(i).piece.replace(/^"|"$/g, '');

                    let match = payload.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (!match) {
                        continue;
                    }

                    let type = match[1];
                    if (type == 'jpeg') {
                        type = 'jpg';
                    }

                    urls.push({
                        type: type,
                        data: match[2],
                    });
                }

                resolve(urls);

            }, null);
        });
    });
}

function createZip(dataUrls) {
    let zip = new JSZip();
    let padding = Math.max(3, dataUrls.length.toString(10).length);

    for (let i = 0; i < dataUrls.length; i++) {
        let name = `${i.toString(10).padStart(padding, '0')}.${dataUrls[i].type}`;
        zip.file(name, dataUrls[i].data, {base64: true});
    }

    return zip;
}

function downloadBook(callback) {
    fetchDataURLs().then(function(urls) {
        let archive = createZip(urls);
        archive.generateAsync({type:"blob"}).then(function(blob) {
            saveAs(blob, "hello.zip");
        });
    });
}

chrome.runtime.onMessage.addListener(function(message, sender, callback) {
    downloadBook(callback);
});
