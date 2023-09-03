//Order is Nose, LEye, REye, LEar, REar, LShoulder, RShoulder, LElbow, RElbow, LWrist, RWrist, LHip, RHip, LKnee, RKnee, LAnkle, RAnkle
let positions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let corners = [];

let keepRatio = false;
//Draw pose outline
let drawPose = true;

//Filters
let drawMustache = false;
let drawGlasses = false;
let drawClownNose = false;
let drawShirtOverlay = false;

//Other Stuff
let clownNoseFlag = true;
let imageInput;

function preload() {
    oswald = loadFont("Oswald/static/Oswald-Regular.ttf");

    overlayImage = loadImage('example.webp');
    mustache = loadImage("mustache.png");
    clownNose = loadImage("clownNose.png");
    clownSound = loadSound("clownSound.mp3");
}

function setup() {
    canvas = createCanvas(640, 480, WEBGL);
    canvas.center();
    video = createCapture(VIDEO);
    video.hide();

    imageInput = createFileInput(handleFile);
    imageInput.position(windowWidth / 2 - imageInput.width / 2, 710);

    poseNet = ml5.poseNet(video, ModelLoaded);
    poseNet.on("pose", GotPoses);

    textureMode(NORMAL);

    //Presets
    document.getElementById("drawPose").checked = drawPose;
    document.getElementById("mustache").checked = drawMustache;
    document.getElementById("clownNose").checked = drawClownNose;
    document.getElementById("shirtOverlay").checked = drawShirtOverlay;
    document.getElementById("keepRatio").checked = keepRatio;
}

function handleFile(file) {
    print(file);

    if (file.type === 'image') {
        overlayImage = createImg(file.data, '');
        overlayImage.hide();
    } else {
        overlayImage = null;
    }
}

function draw() {
    translate(-width / 2, -height / 2);
    image(video, 0, 0, width, height);

    drawPose = document.getElementById("drawPose").checked;
    drawMustache = document.getElementById("mustache").checked;
    drawClownNose = document.getElementById("clownNose").checked;
    drawShirtOverlay = document.getElementById("shirtOverlay").checked;
    keepRatio = document.getElementById("keepRatio").checked;

    document.getElementById("keepRatio").disabled = !drawShirtOverlay;

    if (drawPose) {
        fill("#FF0000");
        stroke("#FF0000");
        strokeWeight(5);
        for (var i = 0; i < positions.length; i += 2) {
            ellipse(positions[i], positions[i + 1], 10, 10);
            // console.log(i, i + 1, positions[i], positions[i + 1]);
        }

        //LEye - REye
        line(positions[2], positions[3], positions[4], positions[5]);

        //LShoulder - RShoulder
        line(positions[10], positions[11], positions[12], positions[13]);

        //LShoulder - LElbow
        line(positions[10], positions[11], positions[14], positions[15]);

        //RShoulder - RElbow
        line(positions[12], positions[13], positions[16], positions[17]);

        //LElbow - LWrist
        line(positions[14], positions[15], positions[18], positions[19]);

        //RElbow - RWrist
        line(positions[16], positions[17], positions[20], positions[21]);

        //LShoulder - LHip
        line(positions[10], positions[11], positions[22], positions[23]);

        //RShoulder - RHip
        line(positions[12], positions[13], positions[24], positions[25]);

        //LHip - RHip
        line(positions[22], positions[23], positions[24], positions[25]);

        //LHip - LKnee
        line(positions[22], positions[23], positions[26], positions[27]);

        //RHip - RKnee
        line(positions[24], positions[25], positions[28], positions[29]);

        //LKnee - LAnkle
        line(positions[26], positions[27], positions[30], positions[31]);

        //RKnee - RAnkle
        line(positions[28], positions[29], positions[32], positions[33]);
    }

    if (drawMustache) {
        mustache.width = 120;
        mustache.height = 45;

        image(mustache, positions[0] - mustache.width / 2, positions[1] - mustache.height / 2 + 20);
    }

    if (drawClownNose) {
        clownNose.width = 30;
        clownNose.height = 30;

        image(clownNose, positions[0] - clownNose.width / 2, positions[1] - clownNose.height / 2);

        if ((dist(positions[0], positions[1], positions[18], positions[19]) < 40 || dist(positions[0], positions[1], positions[20], positions[21]) < 40)) {
            if (clownNoseFlag) {
                console.log("playing");
                clownSound.play();

                clownNoseFlag = false;
            }
        } else {
            clownNoseFlag = true;
        }
    }

    corners[0] = createVector(positions[10], positions[11]);
    corners[1] = createVector(positions[12], positions[13]);
    corners[2] = createVector(positions[24], positions[25]);
    corners[3] = createVector(positions[22], positions[23]);

    if (keepRatio) {
        let imgAspectRatio = overlayImage.width / overlayImage.height;
        let quadWidth = dist(corners[0].x, corners[0].y, corners[1].x, corners[1].y);
        let quadHeight = dist(corners[0].x, corners[0].y, corners[3].x, corners[3].y);

        if (quadWidth / quadHeight > imgAspectRatio) {
            let newQuadWidth = quadHeight * imgAspectRatio;
            let dx = (quadWidth - newQuadWidth) / 2;
            corners[0].x += dx;
            corners[1].x -= dx;
            corners[2].x -= dx;
            corners[3].x += dx;
        } else {
            let newQuadHeight = quadWidth / imgAspectRatio;
            let dy = (quadHeight - newQuadHeight) / 2;
            corners[0].y += dy;
            corners[1].y += dy;
            corners[2].y -= dy;
            corners[3].y -= dy;
        }
    }

    if (drawShirtOverlay && overlayImage != null) {
        // Draw the distorted image
        beginShape();
        texture(overlayImage);
        vertex(corners[0].x, corners[0].y, 1, 0);
        vertex(corners[1].x, corners[1].y, 0, 0);
        vertex(corners[2].x, corners[2].y, 0, 1);
        vertex(corners[3].x, corners[3].y, 1, 1);
        endShape(CLOSE);
    }
}

function TakeSnapshot() {
    save("myFilter.png");
}

function ModelLoaded() {
    console.log("PoseNet Initialized");
}

function GotPoses(results) {
    if (results.length > 0) {
        // console.log(results);
        // console.log("noseX = " + results[0].pose.nose.x);
        // console.log("noseY = " + results[0].pose.nose.y);

        //Nose
        positions[0] = results[0].pose.nose.x;
        positions[1] = results[0].pose.nose.y;

        //LEye
        positions[2] = results[0].pose.leftEye.x;
        positions[3] = results[0].pose.leftEye.y;

        //REye
        positions[4] = results[0].pose.rightEye.x;
        positions[5] = results[0].pose.rightEye.y;

        //LEar
        positions[6] = results[0].pose.leftEar.x;
        positions[7] = results[0].pose.leftEar.y;

        //REar
        positions[8] = results[0].pose.rightEar.x;
        positions[9] = results[0].pose.rightEar.y;

        //LShoulder
        positions[10] = results[0].pose.leftShoulder.x;
        positions[11] = results[0].pose.leftShoulder.y;

        //RShoulder
        positions[12] = results[0].pose.rightShoulder.x;
        positions[13] = results[0].pose.rightShoulder.y;

        //LElbow
        positions[14] = results[0].pose.leftElbow.x;
        positions[15] = results[0].pose.leftElbow.y;

        //RElbow
        positions[16] = results[0].pose.rightElbow.x;
        positions[17] = results[0].pose.rightElbow.y;

        //LWrist
        positions[18] = results[0].pose.leftWrist.x;
        positions[19] = results[0].pose.leftWrist.y;

        //RWrist
        positions[20] = results[0].pose.rightWrist.x;
        positions[21] = results[0].pose.rightWrist.y;

        //LHip
        positions[22] = results[0].pose.leftHip.x;
        positions[23] = results[0].pose.leftHip.y;

        //RHip
        positions[24] = results[0].pose.rightHip.x;
        positions[25] = results[0].pose.rightHip.y;

        //LKnee
        positions[26] = results[0].pose.leftKnee.x;
        positions[27] = results[0].pose.leftKnee.y;

        //RKnee
        positions[28] = results[0].pose.rightKnee.x;
        positions[29] = results[0].pose.rightKnee.y;

        //LAnkle
        positions[30] = results[0].pose.leftAnkle.x;
        positions[31] = results[0].pose.leftAnkle.y;

        //RAnkle
        positions[32] = results[0].pose.rightAnkle.x;
        positions[33] = results[0].pose.rightAnkle.y;
    }
}
