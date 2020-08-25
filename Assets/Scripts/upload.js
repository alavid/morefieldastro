function upload( file ) {

    return new Promise(( resolve, reject ) => {

        let largeImage = resize(file, 2000);

        largeImage.then(( data ) => {

            let originalSize = `${data.originalSize.width}x${data.originalSize.height}`;

            let formData = new FormData;
            formData.append("file", data.image);

            $.ajax({url: "upload", dataType: "text", cache: false, contentType: false,
                    processData: false, data: formData, type: "POST"})
            .done(( res ) => {

                let thumbnail = resize(file, 320, `${file.name.split(".")[0]}_thumb.${file.name.split(".")[1]}`);

                thumbnail.then(( data ) => {

                    let thumbData = new FormData;
                    thumbData.append("file", data.image);

                    $.ajax({url: "upload", dataType: "text", cache: false, contentType: false,
                            processData: false, data: thumbData, type: "POST"})
                    .done(( res ) => { console.log("E"); resolve({size: originalSize, cube: JSON.parse(res).cube}); })
                    .catch(( err ) => { reject(err); });

                }).catch(( err ) => { reject(err); });

            }).catch(( err ) => { reject(err); });

        }).catch(( err ) => { reject(err); });
    });
}
