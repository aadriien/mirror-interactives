let components = [];
let selected = null;
let dragOffset;

function setup() {
    // Toolbar at 40px currently
    createCanvas(windowWidth, windowHeight - 40); 
}

function draw() {
    background(255);
    
    // Draw real components (real room)
    for (let comp of components) {
        comp.display();
    }
    
    // Draw virtual reflections from mirrors
    for (let mirror of components.filter(c => c.type === 'mirror')) {
        let mirrorX = mirror.pos.x;

        for (let comp of components) {
            if (comp.displayReflected) {
                comp.displayReflected(mirrorX);
            }
        }
    }
}


function mousePressed() {
    for (let i = components.length - 1; i >= 0; i--) {
        if (components[i].isHit(mouseX, mouseY)) {
            selected = components[i];

            dragOffset = createVector(
                mouseX - selected.pos.x, 
                mouseY - selected.pos.y
            );
            return;
        }
    }
    selected = null;
}

function mouseDragged() {
    if (selected) {
        selected.pos.x = mouseX - dragOffset.x;
        selected.pos.y = mouseY - dragOffset.y;
    }
}

function mouseReleased() {
    selected = null;
}

// ----------------------------
// Component Constructors
// ----------------------------

function addMirror() {
    components.push({
        type: 'mirror',
        pos: createVector(width / 2, height / 2),
        display() {
            stroke(100);
            strokeWeight(3);
            line(this.pos.x, 0, this.pos.x, height);
        },
        isHit(mx, my) {
            return abs(mx - this.pos.x) < 5;
        }
    });
}


function addObject() {
    components.push(new ObjectMarker(createVector(width / 2 - 100, height / 2)));
}

function addEye() {
    components.push(new Eye(createVector(width / 2 + 100, height / 2)));
}

function addRay() {
    components.push(new Ray(createVector(100, 100), createVector(300, 300)));
}

// ----------------------------
// Component Classes
// ----------------------------

class Mirror {
    constructor(pos) {
        this.pos = pos;
    }
    
    display() {
        stroke(0);
        strokeWeight(4);
        line(this.pos.x, 0, this.pos.x, height);
    }
    
    isHit(x, y) {
        return abs(x - this.pos.x) < 5;
    }
}

class ObjectMarker {
    constructor(pos) {
        this.pos = pos;
        this.type = 'object';
    }
    
    display() {
        fill(255, 100, 100);
        noStroke();
        ellipse(this.pos.x, this.pos.y, 20);
    }
    
    displayReflected(mirrorX) {
        let reflectedX = 2 * mirrorX - this.pos.x;
        noFill();
        stroke(0);
        strokeWeight(1);

        drawingContext.setLineDash([4, 4]);
        ellipse(reflectedX, this.pos.y, 20);
        drawingContext.setLineDash([]);
    }
    
    isHit(x, y) {
        return dist(x, y, this.pos.x, this.pos.y) < 10;
    }
}


class Eye {
    constructor(pos) {
        this.pos = pos;
        this.type = 'eye';
    }
    
    display() {
        textSize(24);
        textAlign(CENTER, CENTER);
        text("👁️", this.pos.x, this.pos.y);
    }
    
    displayReflected(mirrorX) {
        let reflectedX = 2 * mirrorX - this.pos.x;
        textSize(24);
        textAlign(CENTER, CENTER);

        drawingContext.setLineDash([4, 4]);
        text("👁️", reflectedX, this.pos.y);
        drawingContext.setLineDash([]);
    }
    
    isHit(x, y) {
        return dist(x, y, this.pos.x, this.pos.y) < 15;
    }
}


class Ray {
    constructor(start, end) {
        this.pos = start.copy();
        this.end = end.copy();
        this.type = 'ray';
    }
    
    display() {
        stroke(255, 150, 0);
        strokeWeight(2);
        line(this.pos.x, this.pos.y, this.end.x, this.end.y);
    }
    
    displayReflected(mirrorX) {
        // Reflect both endpoints across mirror
        let startR = createVector(2 * mirrorX - this.pos.x, this.pos.y);
        let endR = createVector(2 * mirrorX - this.end.x, this.end.y);
        
        stroke(100);
        strokeWeight(1.5);

        drawingContext.setLineDash([5, 5]);
        line(startR.x, startR.y, endR.x, endR.y);
        drawingContext.setLineDash([]);
    }
    
    isHit(x, y) {
        let d1 = dist(x, y, this.pos.x, this.pos.y);
        let d2 = dist(x, y, this.end.x, this.end.y);
        
        let len = dist(this.pos.x, this.pos.y, this.end.x, this.end.y);
        return abs(d1 + d2 - len) < 5;
    }
}


