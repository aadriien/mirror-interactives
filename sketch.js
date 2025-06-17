let components = [];
let selected = null;
let dragOffset;
let showReflection = true;

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
            if (comp.displayReflected && showReflection) {
                comp.displayReflected(mirrorX);
            }
        }
    }
}


function mousePressed() {
    // Only test components that are draggable
    for (let i = components.length - 1; i >= 0; i--) {
        let comp = components[i];
        
        if (typeof comp.isHit === 'function' && comp.pos) {
            if (comp.isHit(mouseX, mouseY)) {
                selected = comp;
                dragOffset = createVector(
                    mouseX - comp.pos.x,
                    mouseY - comp.pos.y
                );
                return;
            }
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
    components.push(new Eye(createVector(width / 2 - 100, height / 2 + 100)));
}

function addRayFromObjectToEye() {
    let source = components.find(c => c.type === 'object');
    let target = components.find(c => c.type === 'eye');
    
    if (!source || !target) {
        alert("Need both an object and an eye to add a ray!");
        return;
    }
    
    components.push(new RayLink(source, target));
}

function showHideReflection() {
    showReflection = !showReflection;
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


class RayLink {
    constructor(source, target) {
        this.source = source; // ObjectMarker
        this.target = target; // Eye
        this.type = 'raylink';
    }
    
    display() {
        // Find mirrors between source & target horizontally
        let mirrors = components
            .filter(c => c.type === 'mirror')
            .filter(m => {
                let x = m.pos.x;
                return (x > Math.min(this.source.pos.x, this.target.pos.x)) && (x < Math.max(this.source.pos.x, this.target.pos.x));
            })
            .sort((a, b) => a.pos.x - b.pos.x);  
        
        if (mirrors.length === 0) {
            // No mirrors, no reflected rays to draw (just orange direct)
            stroke(255, 150, 0);
            strokeWeight(2);
            line(this.source.pos.x, this.source.pos.y, this.target.pos.x, this.target.pos.y);
            return;
        }
        
        // Build points array: start with source position
        let points = [this.source.pos.copy()];
        
        // Add mirror hit points (same y as source for simplicity)
        for (let m of mirrors) {
            points.push(createVector(m.pos.x, this.source.pos.y));
        }
        
        // End with target position
        points.push(this.target.pos.copy());
        
        // Draw reflected ray segments in blue
        stroke(0, 150, 255);
        strokeWeight(2);
        for (let i = 0; i < points.length - 1; i++) {
            line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
        }
        
        // Draw virtual backtraces (dashed lines)
        stroke(100);
        drawingContext.setLineDash([4, 4]);
        for (let i = 1; i < points.length - 1; i++) {
            let mirrorX = points[i].x;
            let nextPoint = points[i + 1];
            let virtualX = 2 * mirrorX - nextPoint.x;
            line(points[i].x, points[i].y, virtualX, nextPoint.y);
        }
        drawingContext.setLineDash([]);
    }
}
    
    
    
    
    
    