let rooms = [];
let selectedRoom = null;
let selectedComponent = null;

let dragOffset;
let isDraggingRoom = false;
let showReflection = true;
let placingMirror = false;

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

        for (let mirrorSide of this.mirrors) {
            let virtual;

            switch (mirrorSide) {
                case "right":
                    virtual = new Room(this.x + this.w + offset, this.y, this.w, this.h);
                    break;
                case "left":
                    virtual = new Room(this.x - this.w - offset, this.y, this.w, this.h);
                    break;
                case "top":
                    virtual = new Room(this.x, this.y - this.h - offset, this.w, this.h);
                    break;
                case "bottom":
                    virtual = new Room(this.x, this.y + this.h + offset, this.w, this.h);
                    break;
            }

            if (!virtual) continue;

            virtual.isVirtual = true;

            for (let comp of this.components) {
                if (!comp.getReflected) continue;

                let reflected;
                if (mirrorSide === "left" || mirrorSide === "right") {
                    let mirrorX = mirrorSide === "right" ? this.x + this.w : this.x;
                    let dx = mirrorX - comp.pos.x;
                    reflected = comp.getReflected(mirrorX + dx, comp.pos.y);
                } 
                else {
                    let mirrorY = mirrorSide === "bottom" ? this.y + this.h : this.y;
                    let dy = mirrorY - comp.pos.y;
                    reflected = comp.getReflected(comp.pos.x, mirrorY + dy);
                }

                if (reflected) virtual.addComponent(reflected);
            }

            virtual.draw();
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
        stroke(255, 150, 0);
        strokeWeight(2);
        line(this.source.pos.x, this.source.pos.y, this.target.pos.x, this.target.pos.y);
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
}

// -------------------- Mouse Events --------------------

function mousePressed() {
    if (placingMirror && selectedRoom && !selectedRoom.isVirtual) {
        const edge = detectEdge(selectedRoom, mouseX, mouseY);
        if (edge) {
            if (!selectedRoom.mirrors.includes(edge)) {
                selectedRoom.mirrors.push(edge);
            } else {
                alert("This edge already has a mirror.");
            }
            placingMirror = false;
            return;
        } else {
            alert("Click near an edge of the selected room.");
            return;
        }
    }

    selectedComponent = null;
    isDraggingRoom = false;

    for (let room of rooms) {
        if (room.isVirtual) continue;
        for (let comp of room.components) {
            if (comp.isHit(mouseX, mouseY)) {
                selectedComponent = comp;
                selectedRoom = room;

                dragOffset = createVector(mouseX - comp.pos.x, mouseY - comp.pos.y);
                updateRoomSelector();
                return;
            }
        }
    }

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
    if (selectedComponent && selectedComponent.room) {
        let room = selectedComponent.room;
        let newX = constrain(mouseX - dragOffset.x, room.x + 10, room.x + room.w - 10);
        let newY = constrain(mouseY - dragOffset.y, room.y + 10, room.y + room.h - 10);
        selectedComponent.pos.set(newX, newY);
    } else if (isDraggingRoom && selectedRoom) {
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
    let obj = selectedRoom.components.find(c => c.type === 'object');
    let eye = selectedRoom.components.find(c => c.type === 'eye');

    if (obj && eye) {
        selectedRoom.addComponent(new RayLink(obj, eye));
    } 
    else {
        alert("You need an object and an eye in the room.");
    }
}

function toggleReflection() {
    showReflection = !showReflection;
}

function startPlacingMirror() {
    if (!selectedRoom) return alert("Please select a room first.");
    placingMirror = true;
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
