/* resize.js
 * Alex Morefield 2020
 * Provides asynchronous function resize(), which will resize an
 * image received from an HTML form.
 * fileData: The image to resize. Expecting a member of the "files" property
 * of a file input from an HTML form.
 * width: The new width to resize the image.
 * name: Optional parameter to give the image a new name. Must include file
 * extension if used.
 * Returns: A promise containing a JS object containing the image as a File
 * object, and the original size.
 */
function resize( fileData, width, name ) {

    return new Promise( function( resolve, reject ) {

        var fileName;
        var newWidth;

        if (typeof fileData === "undefined" || typeof width === "undefined") reject("Missing required parameters.");
        if (typeof name === "undefined") fileName = fileData.name;
        else fileName = name;

        newWidth = width;

        const reader = new FileReader();
        reader.readAsDataURL(fileData);

        reader.onload = function(event) {

            const img = new Image();
            img.src = event.target.result;

            img.onload = function() {

                const width = newWidth;
                const height = (width / img.width) * img.height;
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext("2d");
                context.drawImage(img, 0, 0, width, height);

                //Create image file from canvas

                context.canvas.toBlob( function(blob) {
                    const file = new File([blob], fileName, {

                        type: "image/jpeg",
                        lastModified: Date.now()
                    });

                    resolve({image: file, originalSize: {width: img.width, height: img.height}});

                }, "image/jpeg", 1);

                reader.onerror = function(err) {

                    reject(err);
                }
            }
        }

    });
}
