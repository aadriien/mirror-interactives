let rooms = [];
let selectedRoom = null;
let selectedComponent = null;

let isCreatingRay = false;
let previewRay = null;
let pendingRayStart = null;
let previewRayEnd = null;

let dragOffset;
let isDraggingRoom = false;
let showReflection = true;
let placingMirror = false;

let isCreatingBouncedRay = false;
let bounceRayStage = 0;
let bounceStart = null;
let bounceEnd = null;
let bounceMirrorSide = null;


// -------------------- Classes --------------------

class Room {
    constructor(x, y, w = 200, h = 200) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.components = [];
        this.mirrors = []; 
        this.isVirtual = false;
    }

    addComponent(comp) {
        comp.room = this;
        this.components.push(comp);
    }

    draw() {
        stroke(this === selectedRoom ? 'orange' : 0);
        strokeWeight(2);
        noFill();
        rect(this.x, this.y, this.w, this.h);

        noStroke();
        fill(0);
        textAlign(LEFT, TOP);
        textSize(12);
        text(this.isVirtual ? "Virtual Room" : "Real Room", this.x + 5, this.y + 5);

        if (!this.isVirtual) {
            stroke(0, 0, 255);
            strokeWeight(3);

            for (let side of this.mirrors) {
                switch (side) {
                    case "right":
                        line(this.x + this.w, this.y, this.x + this.w, this.y + this.h);
                        break;
                    case "left":
                        line(this.x, this.y, this.x, this.y + this.h);
                        break;
                    case "top":
                        line(this.x, this.y, this.x + this.w, this.y);
                        break;
                    case "bottom":
                        line(this.x, this.y + this.h, this.x + this.w, this.y + this.h);
                        break;
                }
            }
        }

        for (let comp of this.components) comp.draw();
    }

    drawReflected() {
        if (!this.mirrors.length || !showReflection || this.isVirtual) return;
    
        const offset = 20;
    
        for (let side of this.mirrors) {
            let virtualX = this.x;
            let virtualY = this.y;
            let mirrorX, mirrorY;
    
            switch (side) {
                case "right":
                    mirrorX = this.x + this.w;
                    virtualX = mirrorX + offset;
                    break;
                case "left":
                    mirrorX = this.x;
                    virtualX = mirrorX - this.w - offset;
                    break;
                case "top":
                    mirrorY = this.y;
                    virtualY = mirrorY - this.h - offset;
                    break;
                case "bottom":
                    mirrorY = this.y + this.h;
                    virtualY = mirrorY + offset;
                    break;
            }
    
            let virtualRoom = new Room(virtualX, virtualY, this.w, this.h);
            virtualRoom.isVirtual = true;
    
            // Keep track of reflected components (non-rays) for ray linking
            let reflectedComponents = [];
    
            for (let comp of this.components) {
                if (!comp.getReflected) continue;
    
                if (comp.type === 'ray') continue; // skip rays for now
    
                // Reflect component position based on mirror side
                let reflectedComp;
    
                if (side === "right" || side === "left") {
                    let dx = mirrorX - comp.pos.x;
                    let reflectedX = mirrorX + dx + (side === "right" ? offset : -offset);
                    let reflectedY = comp.pos.y;
    
                    reflectedComp = comp.getReflected(reflectedX, reflectedY);
                } 
                else {
                    let dy = mirrorY - comp.pos.y;
                    let reflectedX = comp.pos.x;
                    let reflectedY = mirrorY + dy + (side === "bottom" ? offset : -offset);
    
                    reflectedComp = comp.getReflected(reflectedX, reflectedY);
                }
    
                // Track original comp to map rays later
                reflectedComp.original = comp;
    
                virtualRoom.addComponent(reflectedComp);
                reflectedComponents.push(reflectedComp);
            }
    
            // Now reflect rays by linking reflected sources and targets
            for (let comp of this.components) {
                if (comp.type === 'ray') {
                    // Find reflected source and target based on original tracking
                    let reflectedSource = reflectedComponents.find(c => c.original === comp.source);
                    let reflectedTarget = reflectedComponents.find(c => c.original === comp.target);
    
                    if (reflectedSource && reflectedTarget) {
                        let reflectedRay = comp.getReflected(reflectedSource, reflectedTarget);
                        reflectedRay.isVirtual = true;  // mark for dotted drawing style
                        virtualRoom.addComponent(reflectedRay);
                    }
                }
            }
    
            virtualRoom.draw();
        }
    }
    

    isInside(x, y) {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        
        for (let comp of this.components) {
            comp.pos.x += dx;
            comp.pos.y += dy;
        }
    }
}

class Component {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.room = null;
    }

    isHit(x, y) {
        return dist(x, y, this.pos.x, this.pos.y) < 10;
    }
}

class ObjectMarker extends Component {
    constructor(x, y) {
        super(x, y);
        this.type = 'object';
    }

    draw() {
        fill(255, 100, 100);
        noStroke();
        ellipse(this.pos.x, this.pos.y, 20);
    }

    getReflected(x, y) {
        return new ObjectMarker(x, y);
    }
}

class Eye extends Component {
    constructor(x, y) {
        super(x, y);
        this.type = 'eye';
    }

    draw() {
        textAlign(CENTER, CENTER);
        textSize(20);
        text("\uD83D\uDC41\uFE0F", this.pos.x, this.pos.y);
    }

    getReflected(x, y) {
        return new Eye(x, y);
    }
}

class RayLink extends Component {
    constructor(source, target) {
        super(0, 0);
        this.source = source;
        this.target = target;
        this.type = 'ray';
    }

    draw() {
        // Solid line for real room, or dotted for virtual
        if (this.isVirtual) {
            drawingContext.setLineDash([5, 5]); 
        } 
        else {
            drawingContext.setLineDash([]); 
        }

        stroke(255, 150, 0);
        strokeWeight(2);
        line(this.source.pos.x, this.source.pos.y, this.target.pos.x, this.target.pos.y);
    
        // Draw arrowhead
        let angle = atan2(this.target.pos.y - this.source.pos.y, this.target.pos.x - this.source.pos.x);
        let len = 10;

        push();
        translate(this.target.pos.x, this.target.pos.y);
        rotate(angle);

        fill(255, 150, 0);
        noStroke();
        triangle(0, 0, -len, -len / 2, -len, len / 2);
        pop();

        // Restore to regular solid line
        drawingContext.setLineDash([]);
    }    

    getReflected(reflectedSource, reflectedTarget) {
        return new RayLink(reflectedSource, reflectedTarget);
    }
}

class ReflectionPoint extends Component {
    constructor(x, y) {
        super(x, y);
        this.type = 'reflection';
    }

    draw() {
        fill(0, 200, 255);
        noStroke();
        ellipse(this.pos.x, this.pos.y, 10);
    }

    getReflected(x, y) {
        return new ReflectionPoint(x, y);
    }
}


// ------------------ p5 Setup --------------------

function setup() {
    createCanvas(windowWidth, windowHeight - 60);
    addRoom();
    updateRoomSelector();
    textFont('Arial');
}

function draw() {
    background(240);
    for (let room of rooms) {
        room.draw();
        if (!room.isVirtual) room.drawReflected();
    }

    // Draw preview ray if drawing one
    if (previewRay) {
        // Draw preview ray with partial transparency
        push();
        stroke(255, 150, 0, 150);
        strokeWeight(2);
        previewRay.draw();
        pop();
    }    
}

// -------------------- Mouse Events --------------------

function mousePressed() {
    if (placingMirror && selectedRoom && !selectedRoom.isVirtual) {
        const edge = detectEdge(selectedRoom, mouseX, mouseY);
        if (edge) {
            if (!selectedRoom.mirrors.includes(edge)) {
                selectedRoom.mirrors.push(edge);
            } 
            else {
                alert("This edge already has a mirror.");
            }
            placingMirror = false;
            return;
        } 
        else {
            alert("Click near an edge of the selected room.");
            return;
        }
    }

    if (isCreatingBouncedRay) {
        if (bounceRayStage === 0) {
            // Stage 0: click on object
            for (let comp of selectedRoom.components) {
                if (comp.type === 'object' && comp.isHit(mouseX, mouseY)) {
                    bounceStart = comp;
                    bounceRayStage = 1;
                    alert("Now click on a mirror edge.");
                    return;
                }
            }
            alert("You must start by clicking an object.");
            return;
        } 
        else if (bounceRayStage === 1) {
            // Stage 1: click on mirror
            const edge = detectEdge(selectedRoom, mouseX, mouseY);
            if (edge && selectedRoom.mirrors.includes(edge)) {
                bounceMirrorSide = edge;
                bounceRayStage = 2;
                alert("Now click on an eye.");
            } else {
                alert("Click on an edge that has a mirror.");
            }
            return;
        } 
        else if (bounceRayStage === 2) {
            for (let comp of selectedRoom.components) {
                if (comp.type === 'eye' && comp.isHit(mouseX, mouseY)) {
                    bounceEnd = comp;
                    createBouncedRay(bounceStart, bounceEnd, bounceMirrorSide);
                    isCreatingBouncedRay = false;
                    bounceRayStage = 0;
                    return;
                }
            }
            alert("Click on an eye to complete the ray.");
            return;
        }
    }
    

    selectedComponent = null;
    isDraggingRoom = false;

    // Check if clicking on component to start a ray drag or drag component
    for (let room of rooms) {
        if (room.isVirtual) continue;
        for (let comp of room.components) {
            if (comp.isHit(mouseX, mouseY)) {
                selectedComponent = comp;
                selectedRoom = room;

                dragOffset = createVector(mouseX - comp.pos.x, mouseY - comp.pos.y);
                updateRoomSelector();

                // ONLY start ray drag if in ray creation mode AND clicked on object or eye
                if (isCreatingRay && (comp.type === 'object' || comp.type === 'eye')) {
                    pendingRayStart = comp;
                    previewRayEnd = createVector(mouseX, mouseY);
                    previewRay = new RayLink(pendingRayStart, { pos: previewRayEnd });
                }             

                return;
            }
        }
    }

    // If clicked inside a room to drag the room
    for (let room of rooms) {
        if (!room.isVirtual && room.isInside(mouseX, mouseY)) {
            selectedRoom = room;
            isDraggingRoom = true;

            dragOffset = createVector(mouseX - room.x, mouseY - room.y);
            updateRoomSelector();
            return;
        }
    }

    updateRoomSelector();
}

function mouseDragged() {
    if (pendingRayStart) {
        // Update preview ray end position while dragging
        previewRayEnd.set(mouseX, mouseY);
        previewRay.target.pos = previewRayEnd;
    }
    
    else if (selectedComponent && selectedComponent.room) {
        let room = selectedComponent.room;
        let newX = constrain(mouseX - dragOffset.x, room.x + 10, room.x + room.w - 10);
        let newY = constrain(mouseY - dragOffset.y, room.y + 10, room.y + room.h - 10);
        selectedComponent.pos.set(newX, newY);
    } 
    else if (isDraggingRoom && selectedRoom) {
        let newX = mouseX - dragOffset.x;
        let newY = mouseY - dragOffset.y;
        let dx = newX - selectedRoom.x;
        let dy = newY - selectedRoom.y;
        selectedRoom.move(dx, dy);
    }
}

function mouseReleased() {
    if (pendingRayStart) {
        for (let room of rooms) {
            if (room.isVirtual) continue;
            for (let comp of room.components) {
                if (comp.isHit(mouseX, mouseY) && comp !== pendingRayStart) {
                    if (
                        (pendingRayStart.type === 'object' && comp.type === 'eye') ||
                        (pendingRayStart.type === 'eye' && comp.type === 'object')
                    ) {
                        let ray = new RayLink(pendingRayStart, comp);
                        selectedRoom.addComponent(ray);
                        break;
                    }
                }
            }
        }
        previewRay = null;
        pendingRayStart = null;
        previewRayEnd = null;

        // Exit ray creation mode after one ray is created (or canceled)
        isCreatingRay = false;
    }

    selectedComponent = null;
    isDraggingRoom = false;
}

// -------------------- UI Actions --------------------

function addRoom() {
    let x = 50 + rooms.length * 250;
    let y = 100;
    let room = new Room(x, y);

    rooms.push(room);
    selectedRoom = room;
    updateRoomSelector();
}

function addObject() {
    if (!selectedRoom) return alert("Please select a room first.");
    selectedRoom.addComponent(new ObjectMarker(selectedRoom.x + 50, selectedRoom.y + 100));
}

function addEye() {
    if (!selectedRoom) return alert("Please select a room first.");
    selectedRoom.addComponent(new Eye(selectedRoom.x + 150, selectedRoom.y + 100));
}

function addRay() {
    if (!selectedRoom) return alert("Please select a room first.");
    isCreatingRay = true;
    alert("Ray creation mode: click on an object or eye and drag to create a ray.");
}

function addBouncedRay() {
    if (!selectedRoom) return alert("Please select a room.");
    isCreatingBouncedRay = true;
    bounceRayStage = 0;
    alert("Click on an object, then a mirror edge, then the eye.");
}

function createBouncedRay(obj, eye, mirrorSide) {
    let mirrorX, mirrorY;

    switch (mirrorSide) {
        case "left":
        case "right":
            mirrorX = (mirrorSide === "left") ? selectedRoom.x : selectedRoom.x + selectedRoom.w;
            mirrorY = 0;
            break;
        case "top":
        case "bottom":
            mirrorY = (mirrorSide === "top") ? selectedRoom.y : selectedRoom.y + selectedRoom.h;
            mirrorX = 0;
            break;
    }

    // Reflect eye across mirror
    let reflectedEye = eye.pos.copy();

    if (mirrorSide === "left" || mirrorSide === "right") {
        let dx = mirrorX - eye.pos.x;
        reflectedEye.x = mirrorX + dx;
    } 
    else {
        let dy = mirrorY - eye.pos.y;
        reflectedEye.y = mirrorY + dy;
    }

    // Intersection point is where ray from object to reflected eye hits the mirror
    let intersection = lineIntersectMirror(obj.pos, reflectedEye, mirrorSide);

    if (intersection) {
        let reflectionMarker = new ReflectionPoint(intersection.x, intersection.y);

        let ray1 = new RayLink(obj, reflectionMarker);
        let ray2 = new RayLink(reflectionMarker, eye);

        selectedRoom.addComponent(reflectionMarker);
        selectedRoom.addComponent(ray1);
        selectedRoom.addComponent(ray2);
    } 
    else {
        alert("Could not compute reflected ray.");
    }
}


function toggleReflection() {
    showReflection = !showReflection;
}

function startPlacingMirror() {
    if (!selectedRoom) return alert("Please select a room first.");
    placingMirror = true;
}

function lineIntersectMirror(start, end, side) {
    let x1 = start.x, y1 = start.y;
    let x2 = end.x, y2 = end.y;

    switch (side) {
        case "left":
        case "right": {
            let mirrorX = (side === "left") ? selectedRoom.x : selectedRoom.x + selectedRoom.w;
            let t = (mirrorX - x1) / (x2 - x1);
            if (t >= 0 && t <= 1) {
                let y = y1 + t * (y2 - y1);
                return createVector(mirrorX, y);
            }
            break;
        }
        case "top":
        case "bottom": {
            let mirrorY = (side === "top") ? selectedRoom.y : selectedRoom.y + selectedRoom.h;
            let t = (mirrorY - y1) / (y2 - y1);
            if (t >= 0 && t <= 1) {
                let x = x1 + t * (x2 - x1);
                return createVector(x, mirrorY);
            }
            break;
        }
    }
    return null;
}


// -------------------- Room Selector --------------------

function updateRoomSelector() {
    let roomSelect = document.getElementById('roomSelector');
    if (!roomSelect) return;

    roomSelect.innerHTML = '';

    rooms.forEach((room, i) => {
        let option = document.createElement('option');
        option.value = i;
        option.text = `Room ${i + 1} ${room.isVirtual ? '(Virtual)' : ''}`;
        roomSelect.appendChild(option);
    });

    if (selectedRoom) {
        let idx = rooms.indexOf(selectedRoom);
        if (idx >= 0) roomSelect.value = idx;
    }
}

function selectRoomFromDropdown() {
    let roomSelect = document.getElementById('roomSelector');
    let idx = parseInt(roomSelect.value);

    if (!isNaN(idx) && rooms[idx]) {
        selectedRoom = rooms[idx];
    }
}

// -------------------- Mirror Edge Detection --------------------

function detectEdge(room, x, y) {
    const margin = 10;
    if (x >= room.x - margin && x <= room.x + margin && y >= room.y && y <= room.y + room.h)
        return "left";
    if (x >= room.x + room.w - margin && x <= room.x + room.w + margin && y >= room.y && y <= room.y + room.h)
        return "right";
    if (y >= room.y - margin && y <= room.y + margin && x >= room.x && x <= room.x + room.w)
        return "top";
    if (y >= room.y + room.h - margin && y <= room.y + room.h + margin && x >= room.x && x <= room.x + room.w)
        return "bottom";
    return null;
}

