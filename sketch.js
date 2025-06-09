let objPos;
let mirrorX;
let dragging = false;
let offset;

let eyePos;
let draggingEye = false;
let eyeOffset;

// Start at scene 0 - will update on space
let scene = 0; 


function setup() {
    createCanvas(800, 400);
    objPos = createVector(200, 200);
    mirrorX = 400;
    offset = createVector(0, 0);
    eyePos = createVector(600, 200);
    eyeOffset = createVector(0, 0);
}


function draw() {
    background(255);
    drawMirror();
    
    if (scene === 0) {
        drawObserver();
        drawReflectionOfObserver();
        drawSceneInstructions("Scene 0: Drag the 👁️ and observe its reflection.\nPress SPACE to continue.");
    } else if (scene === 1) {
        drawObserver();
        drawObject();
        drawReflectionRays();
        drawSceneInstructions("Scene 1: Drag the 👁️ and the object.\nObserve how the rays reflect. Press SPACE to continue.");
    }
}


function drawMirror() {
    stroke(150);
    strokeWeight(2);
    line(mirrorX, 0, mirrorX, height);
}

function drawObserver() {
    textSize(24);
    textAlign(CENTER, CENTER);
    text("👁️", eyePos.x, eyePos.y);
}

function drawReflectionOfObserver() {
    let reflectedEye = createVector(2 * mirrorX - eyePos.x, eyePos.y);
    
    // Draw mirror-to-virtual-eye dashed line
    stroke(100);
    drawingContext.setLineDash([5, 5]);
    line(mirrorX, eyePos.y, reflectedEye.x, reflectedEye.y);
    drawingContext.setLineDash([]);
    
    // Draw real ray from eye to mirror (solid)
    stroke(0);
    line(eyePos.x, eyePos.y, mirrorX, eyePos.y);
    
    // Draw virtual 👁️ behind mirror
    textSize(24);
    textAlign(CENTER, CENTER);
    text("👁️", reflectedEye.x, reflectedEye.y);
}

function drawObject() {
    fill(255, 100, 100);
    noStroke();
    ellipse(objPos.x, objPos.y, 20);
}

function drawReflectionRays() {
    let hitPoint = createVector(mirrorX, objPos.y);
    
    // Real ray from object to mirror
    stroke(255, 150, 0);
    strokeWeight(2);
    line(objPos.x, objPos.y, hitPoint.x, hitPoint.y);
    
    // Reflected ray from mirror to eye
    stroke(0, 150, 255);
    line(hitPoint.x, hitPoint.y, eyePos.x, eyePos.y);
    
    // Virtual ray (dashed, eye traces it back)
    stroke(100);
    drawingContext.setLineDash([4, 4]);
    let virtualRayEnd = createVector(2 * mirrorX - eyePos.x, eyePos.y);
    line(hitPoint.x, hitPoint.y, virtualRayEnd.x, virtualRayEnd.y);
    drawingContext.setLineDash([]);
    
    // Virtual image of the object (behind mirror)
    let imagePos = createVector(2 * mirrorX - objPos.x, objPos.y);
    noFill();
    stroke(0);
    strokeWeight(1);
    drawingContext.setLineDash([5, 5]);
    ellipse(imagePos.x, imagePos.y, 20);
    drawingContext.setLineDash([]);
}

function drawSceneInstructions(txt) {
    fill(0);
    textSize(14);
    textAlign(LEFT, TOP);
    text(txt, 10, 10);
}

// Handle dragging of objects on canvas
function mousePressed() {
    if (scene >= 0) {
        let dEye = dist(mouseX, mouseY, eyePos.x, eyePos.y);
        if (dEye < 15) {
            draggingEye = true;
            eyeOffset.x = eyePos.x - mouseX;
            eyeOffset.y = eyePos.y - mouseY;
        }
    }
    
    if (scene >= 1) {
        let d = dist(mouseX, mouseY, objPos.x, objPos.y);
        if (d < 10) {
            dragging = true;
            offset.x = objPos.x - mouseX;
            offset.y = objPos.y - mouseY;
        }
    }
}

function mouseDragged() {
    if (dragging) {
        objPos.x = mouseX + offset.x;
        objPos.y = mouseY + offset.y;
    }
    
    if (draggingEye) {
        eyePos.x = mouseX + eyeOffset.x;
        eyePos.y = mouseY + eyeOffset.y;
    }
}

function mouseReleased() {
    dragging = false;
    draggingEye = false;
}

function keyPressed() {
    if (key === ' ') {
        scene++;
    }
}


