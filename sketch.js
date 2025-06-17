let rooms = [];
let selectedRoom = null;
let selectedComponent = null;

let dragOffset;
let isDraggingRoom = false;
let showReflection = true;


// -------------------- Classes --------------------

class Room {
    constructor(x, y, w = 200, h = 200) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.components = [];
        this.hasRightMirror = false;
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
        
        if (this.hasRightMirror && !this.isVirtual) {
            stroke(0, 0, 255);
            strokeWeight(3);
            line(this.x + this.w, this.y, this.x + this.w, this.y + this.h);
        }
        
        for (let comp of this.components) comp.draw();
    }
    
    drawReflected() {
        if (!this.hasRightMirror || !showReflection) return;
        
        const offset = 20;
        const virtualX = this.x + this.w + offset;
        
        let virtual = new Room(virtualX, this.y, this.w, this.h);
        virtual.isVirtual = true;
        
        for (let comp of this.components) {
            if (comp.getReflected) {
                const mirrorX = this.x + this.w;
                virtual.addComponent(comp.getReflected(mirrorX));
            }
        }
        virtual.draw();
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
    
    getReflected(mirrorX) {
        let dx = mirrorX - this.pos.x;
        return new ObjectMarker(mirrorX + dx, this.pos.y);
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
    
    getReflected(mirrorX) {
        let dx = mirrorX - this.pos.x;
        return new Eye(mirrorX + dx, this.pos.y);
    }
}

class RayLink extends Component {
    constructor(source, target) {
        super(0,0);
        this.source = source;
        this.target = target;
        this.type = 'ray';
    }
    
    draw() {
        stroke(255, 150, 0);
        strokeWeight(2);
        line(this.source.pos.x, this.source.pos.y, this.target.pos.x, this.target.pos.y);
    }
}


// ------------------ p5 Canvas Setup --------------------

function setup() {
    createCanvas(windowWidth, windowHeight - 60);
    addRoom(); // add starter room
    updateRoomSelector();
    textFont('Arial');
}

function draw() {
    background(240);
    for (let room of rooms) {
        room.draw();
        if (!room.isVirtual) room.drawReflected();
    }
}


// -------------------- Mouse Events --------------------

function mousePressed() {
    selectedComponent = null;
    isDraggingRoom = false;
    
    for (let room of rooms) {
        if (room.isVirtual) continue;
        for (let comp of room.components) {
            // Be sure to select rooms of component
            if (comp.isHit(mouseX, mouseY)) {
                selectedComponent = comp;
                selectedRoom = room;

                dragOffset = createVector(mouseX - comp.pos.x, mouseY - comp.pos.y);
                updateRoomSelector();
                return;
            }
        }
    }
    
    // If no component hit, check rooms
    selectedRoom = null;
    for (let room of rooms) {
        if (!room.isVirtual && room.isInside(mouseX, mouseY)) {
            selectedRoom = room;
            dragOffset = createVector(mouseX - room.x, mouseY - room.y);
            isDraggingRoom = true;
            updateRoomSelector();
            return;
        }
    }
    
    // If nothing selected, then null
    selectedRoom = null;
    selectedComponent = null;
    updateRoomSelector();
}

function mouseDragged() {
    if (selectedComponent && selectedComponent.room) {
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
    selectedComponent = null;
    isDraggingRoom = false;
}


// -------------------- UI Button Functions --------------------

function addRoom() {
    let x = 50 + rooms.length * 250;
    let y = 100;
    let room = new Room(x, y);
    rooms.push(room);
    selectedRoom = room;
    updateRoomSelector();
}

function addObject() {
    if (!selectedRoom) {
        alert("Please select a room first.");
        return;
    }
    selectedRoom.addComponent(new ObjectMarker(selectedRoom.x + 50, selectedRoom.y + 100));
}

function addEye() {
    if (!selectedRoom) {
        alert("Please select a room first.");
        return;
    }
    selectedRoom.addComponent(new Eye(selectedRoom.x + 150, selectedRoom.y + 100));
}

function addMirror() {
    if (!selectedRoom) {
        alert("Please select a room first.");
        return;
    }
    selectedRoom.hasRightMirror = true;
}

function addRay() {
    if (!selectedRoom) {
        alert("Please select a room first.");
        return;
    }
    let obj = selectedRoom.components.find(c => c.type === 'object');
    let eye = selectedRoom.components.find(c => c.type === 'eye');
    if (obj && eye) {
        selectedRoom.addComponent(new RayLink(obj, eye));
    } else {
        alert("You need an object and an eye in the room.");
    }
}

function toggleReflection() {
    showReflection = !showReflection;
}


// -------------------- Room Selector UI --------------------

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
    
    // Ensure selectedRoom is set if null
    if (!selectedRoom && rooms.length > 0) {
        selectedRoom = rooms[0];
    }
    
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
        updateRoomSelector();
    }
}


