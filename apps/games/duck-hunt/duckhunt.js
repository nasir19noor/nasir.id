let ducks;
let duckCount = 1;
let duckImageNames = ["assets/duck-left.gif", "assets/duck-right.gif"];
let duckWidth = 96;
let duckHeight = 93;

window.onload = function() {
    addDucks();
}

function addDucks() {
    let gameWidth = window.innerWidth;
    let gameHeight = window.innerHeight;

    ducks = [];
    for (let i = 0; i < duckCount; i++) {
        let duckImageName = duckImageNames[Math.floor(Math.random()*2)];
        let duckImage = document.createElement("img");
        duckImage.src = duckImageName;
        duckImage.width = duckWidth;
        duckImage.height = duckHeight;
        duckImage.draggable = false;
        duckImage.style.position = "fixed";
        document.body.appendChild(duckImage);

        let duck = {
            image: duckImage,
            x: randomPosition(gameWidth - duckWidth),
            y: randomPosition(gameHeight - duckHeight)     
        }

        duck.image.style.left = String(duck.x) + "px";
        duck.image.style.top = String(duck.y) + "px";
    }  
}    

function randomPosition(limit) {
    return Math.floor(Math.random()*limit);
}


