
export var Config = {
    /* All the data will be 2^vertFrames x 2^horizFrames in size. This is in tight
       inter-dependence with the fact that StripeScan will project vertFrames
       vertical-striped frames and horizFrames horizontal-striped frames. */
    vertFrames : 7,
    horizFrames : 7,
    /* Any HTTP server serving a JPG of the scene will do */
    cameraServer: "http://192.168.1.109:8080/shot.jpg"
};
