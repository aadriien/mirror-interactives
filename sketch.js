let rooms = [];
let selectedRoom = null;
let selectedComponent = null;
let isDeleteMode = false;

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

let showAllVirtualRooms = false;
const MAX_VIRTUAL_LAYERS = 3;


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

            // Keep track of mirror placement along room edges
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
    
            // Calculate virtual room alignment when mirroring
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
    
            // Skip creating virtual room if it overlaps with a real room
            if (isOverlappingWithRealRoom(virtualX, virtualY, this.w, this.h)) {
                continue;
            }
            
            let virtualRoom = new Room(virtualX, virtualY, this.w, this.h);
            virtualRoom.isVirtual = true;            
    
            // Keep track of reflected components (non-rays) for ray linking
            let reflectedComponents = [];
    
            for (let comp of this.components) {
                if (!comp.getReflected) continue;
                if (comp.type === 'ray') continue; 
    
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
    
            // Now reflect rays by linking reflected sources & targets
            for (let comp of this.components) {
                if (comp.type === 'ray') {
                    // Find reflected source and target based on original tracking
                    let reflectedSource = reflectedComponents.find(c => c.original === comp.source);
                    let reflectedTarget = reflectedComponents.find(c => c.original === comp.target);
    
                    if (reflectedSource && reflectedTarget) {
                        let reflectedRay = comp.getReflected(reflectedSource, reflectedTarget);
                        
                        // Mark virtual for dotted drawing style
                        reflectedRay.isVirtual = true;  
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
        const isVirtual = this.room?.isVirtual;

        // Real == solid line, virtual == dotted
        if (isVirtual) {
            drawingContext.setLineDash([5, 5]); 
            noFill();
            stroke(255, 100, 100); 
        } 
        else {
            drawingContext.setLineDash([]); 
            fill(255, 100, 100);
            noStroke(); 
        }
        ellipse(this.pos.x, this.pos.y, 20);
        drawingContext.setLineDash([]); 
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

        // Use eye emoji as observer icon
        text("\uD83D\uDC41\uFE0F", this.pos.x, this.pos.y);
    }

    getReflected(x, y) {
        return new Eye(x, y);
    }
}

class AttentionGrab extends Component {
    constructor(x, y) {
        super(x, y);
        this.type = 'object';
        this.pulseTime = random(TWO_PI);
    }

    draw() {
        // Allow attention visual to pulse in real room to really highlight it
        this.pulseTime += 0.1;
        let pulse = sin(this.pulseTime) * 3;

        noFill();
        stroke(255, 50, 50); 
        strokeWeight(3);
        ellipse(this.pos.x, this.pos.y, 50 + pulse);
    }

    getReflected(x, y) {
        let reflected = new AttentionGrab(x, y);
        reflected.pulseTime = 0;
        return reflected;
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
    
        // Draw arrowhead for ray direction
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
        if (!room.isVirtual) {
            if (showAllVirtualRooms) {
                let allVirtuals = getAllVirtualRooms(room, MAX_VIRTUAL_LAYERS);

                for (let vroom of allVirtuals) {
                    vroom.draw();
                }
            } 
            else {
                room.drawReflected();  
            }
        }
    }

    // Draw preview ray if creating one / dragging
    if (previewRay) {
        push();
        stroke(255, 150, 0, 150);
        strokeWeight(2);
        previewRay.draw();
        pop();
    }    
}

// -------------------- Mouse Events --------------------

function mousePressed() {
    // Handle mirror placement on real room edge
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

    // Handle rays involving mirror reflection
    if (isCreatingBouncedRay) {
        if (bounceRayStage === 0) {
            // Stage 0: click on object
            for (let comp of selectedRoom.components) {
                if (comp.type === 'object' && comp.isHit(mouseX, mouseY)) {
                    bounceStart = comp;
                    bounceRayStage = 1;
                    alert("Nice! Now click on a mirror edge.");
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
                alert("Great! Now click on an eye.");
            } else {
                alert("Click on an edge that has a mirror.");
            }
            return;
        } 
        else if (bounceRayStage === 2) {
            // Stage 2: click on eye
            for (let comp of selectedRoom.components) {
                if (comp.type === 'eye' && comp.isHit(mouseX, mouseY)) {
                    bounceEnd = comp;
                    createBouncedRay(bounceStart, bounceEnd, bounceMirrorSide);
                    isCreatingBouncedRay = false;
                    bounceRayStage = 0;
                    alert("Nice work! You created a valid reflected ray. Where should it hit the mirror?");
                    return;
                }
            }
            alert("Click on an eye to complete the ray.");
            return;
        }
    }
    
    selectedComponent = null;
    isDraggingRoom = false;

    // Check if clicking on component to start a ray drag vs dragging component
    for (let room of rooms) {
        if (room.isVirtual) continue;
        for (let i = room.components.length - 1; i >= 0; i--) {
            let comp = room.components[i];

            if (comp.isHit(mouseX, mouseY)) {
                selectedComponent = comp;
                selectedRoom = room;

                // If delete mode toggled, then remove item
                if (isDeleteMode) {
                    if (confirm("Delete this component?")) {
                        room.components.splice(i, 1);
                        selectedComponent = null;
                        pendingRayStart = null;
                    }
                    isDeleteMode = false;
                    return;
                }

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

    // If clicked inside a room, can drag the room
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
    // Update preview ray end position while dragging
    if (pendingRayStart) {
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
    // Create a new ray linking object & eye where applicable
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

function addAttentionGrab() {
    if (!selectedRoom) return alert("Please select a room first.");
    selectedRoom.addComponent(new AttentionGrab(selectedRoom.x + 50, selectedRoom.y + 100));
}

function deleteItem() {
    isDeleteMode = true;
}

function addRay() {
    if (!selectedRoom) return alert("Please select a room first.");
    isCreatingRay = true;
    alert("Ray creation mode: click on an object or eye and drag to create a ray. Can you make light travel to the eye from the object?");
}

function addBouncedRay() {
    if (!selectedRoom) return alert("Please select a room.");
    isCreatingBouncedRay = true;
    bounceRayStage = 0;
    alert("Click on an object, then a mirror edge, then the eye.");
}

function createBouncedRay(obj, eye, mirrorSide) {
    let mirrorX, mirrorY;

    // Determine where ray will be hitting mirror
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

    // Intersection point == where ray from object to reflected eye hits mirror
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
    alert("Mirror placing mode: click on one side of the real room to place a mirror.");
}

function lineIntersectMirror(start, end, side) {
    let x1 = start.x, y1 = start.y;
    let x2 = end.x, y2 = end.y;

    // Form the vector that will hit mirror between object & eye
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

// New function to get all virtual rooms up to N layers ("infinite" mirrors)
function getAllVirtualRooms(room, layers = 2) {
    let results = [];

    // Start with real room
    let currentLayerRooms = [room]; 

    for (let layer = 0; layer < layers; layer++) {
        let nextLayerRooms = [];
        for (let baseRoom of currentLayerRooms) {
            for (let side of baseRoom.mirrors) {
                // Calculate virtual room position relative to baseRoom
                let offset = 20;

                let virtualX = baseRoom.x;
                let virtualY = baseRoom.y;
                let mirrorX, mirrorY;

                switch (side) {
                    case "right":
                        mirrorX = baseRoom.x + baseRoom.w;
                        virtualX = mirrorX + offset;
                        break;
                    case "left":
                        mirrorX = baseRoom.x;
                        virtualX = mirrorX - baseRoom.w - offset;
                        break;
                    case "top":
                        mirrorY = baseRoom.y;
                        virtualY = mirrorY - baseRoom.h - offset;
                        break;
                    case "bottom":
                        mirrorY = baseRoom.y + baseRoom.h;
                        virtualY = mirrorY + offset;
                        break;
                }

                // Create virtual room, but skip if it would overlap with real room
                if (isOverlappingWithRealRoom(virtualX, virtualY, baseRoom.w, baseRoom.h)) {
                    continue;  
                }
                
                let virtualRoom = new Room(virtualX, virtualY, baseRoom.w, baseRoom.h);
                virtualRoom.isVirtual = true;                

                // Reflect mirrors to opposite side on virtual room
                virtualRoom.mirrors = baseRoom.mirrors.map(side => {
                    switch(side) {
                        case "left": return "right";
                        case "right": return "left";
                        case "top": return "bottom";
                        case "bottom": return "top";
                        default: return null;
                    }
                }).filter(side => side !== null);


                // Reflect components from baseRoom to virtualRoom 
                for (let comp of baseRoom.components) {
                    if (!comp.getReflected) continue;
                    if (comp.type === 'ray') continue; 

                    let reflectedComp;
                    if (side === "right" || side === "left") {
                        let dx = mirrorX - comp.pos.x;

                        // Must use +/- offset to maintain display rooms positioning
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
                    reflectedComp.original = comp;
                    virtualRoom.addComponent(reflectedComp);
                }

                // Handle rays reflecting in virtual rooms
                for (let comp of baseRoom.components) {
                    if (comp.type === 'ray') {
                        let reflectedSource = virtualRoom.components.find(c => c.original === comp.source);
                        let reflectedTarget = virtualRoom.components.find(c => c.original === comp.target);
                        
                        if (reflectedSource && reflectedTarget) {
                            let reflectedRay = comp.getReflected(reflectedSource, reflectedTarget);
                            reflectedRay.isVirtual = true;
                            virtualRoom.addComponent(reflectedRay);
                        }
                    }
                }

                results.push(virtualRoom);
                nextLayerRooms.push(virtualRoom);
            }
        }
        currentLayerRooms = nextLayerRooms;
    }
    return results;
}

// Check to ensure not overwriting real room with virtual
function isOverlappingWithRealRoom(x, y, w, h) {
    for (let room of rooms) {
        if (!room.isVirtual) {
            if (
                x < room.x + room.w &&
                x + w > room.x &&
                y < room.y + room.h &&
                y + h > room.y
            ) {
                return true;
            }
        }
    }
    return false;
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

