'use strict';

window.kindleCloudDownloader = window.kindleCloudDownloader || {};

window.kindleCloudDownloader.QUERY = `
   SELECT
      B.metadata,
      R.piece
   FROM
      bookinfo B
      JOIN resources R ON R.asin = B.asin
`;

window.kindleCloudDownloader.DB_NAME = 'K4Wbooks';
window.kindleCloudDownloader.DB_VERSION = '7';

function fetchDataURLs() {
    return new Promise(function(resolve, reject) {
        let db = openDatabase(window.kindleCloudDownloader.DB_NAME, window.kindleCloudDownloader.DB_VERSION, window.kindleCloudDownloader.DB_NAME, 0);

        db.transaction(function(tx) {
            tx.executeSql(window.kindleCloudDownloader.QUERY, [], function(tx, results) {
                // {title: [url, ...], ...}
                let urls = {};

                for (let i = 0; i < results.rows.length; i++) {
                    let metadata = results.rows.item(i).metadata;
                    let piece = results.rows.item(i).piece.replace(/^"|"$/g, '');

                    let match = piece.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (!match) {
                        continue;
                    }

                    let title = JSON.parse(metadata).title;
                    if (!(title in urls)) {
                        urls[title] = [];
                    }

                    let type = match[1];
                    if (type == 'jpeg') {
                        type = 'jpg';
                    }

                    urls[title].push({
                        type: type,
                        data: match[2],
                    });
                }

                resolve(urls);

            }, null);
        });
    });
}

function createZip(title, dataUrls) {
    let zip = new JSZip();
    let padding = Math.max(3, dataUrls.length.toString(10).length);

    for (let i = 0; i < dataUrls.length; i++) {
        let name = `${i.toString(10).padStart(padding, '0')}.${dataUrls[i].type}`;
        let path = `${title}/${name}`;

        zip.file(path, dataUrls[i].data, {base64: true});
    }

    return zip;
}

function downloadBook(callback) {
    fetchDataURLs().then(function(urls) {
        if (Object.keys(urls).length == 0) {
            return;
        }

        if (Object.keys(urls).length > 1) {
            console.error(`Multiple books found (${Object.keys(urls)}). Pin just one.`);
        }

        for (let title in urls) {
            console.log(`Preparing "${title} for download.`);

            let archive = createZip(title, urls[title]);
            archive.generateAsync({type:"blob"}).then(function(blob) {
                saveAs(blob, `${title}.zip`);
            });
        }
    });
}

chrome.runtime.onMessage.addListener(function(message, sender, callback) {
    downloadBook(callback);
});
