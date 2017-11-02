headImage = new Image(16, 16);
headImage.src = 'https://i.imgur.com/PJhwMnm.png';

bodyImage = new Image(16, 16);
bodyImage.src = 'https://i.imgur.com/ILwnB5U.png';

tailImage = new Image(16, 16);
tailImage.src = 'https://i.imgur.com/Td35hN5.png';

tongueImage = new Image(16, 16);
tongueImage.src = 'https://i.imgur.com/bgDNgZY.png';

foodImage = new Image(16, 16);
foodImage.src = 'https://i.imgur.com/EnR4ns2.png';

var Game      = Game      || {};
var Keyboard  = Keyboard  || {};
var Component = Component || {};

opposites = {
    'left': 'right',
    'right': 'left',
    'up': 'down',
    'down': 'up'
}

Keyboard.Keymap = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
};

Keyboard.ControllerEvents = function() {
    var self      = this;
    this.pressKey = null;
    this.keymap   = Keyboard.Keymap;

    document.onkeydown = function(event) {
        self.pressKey = event.which;
    };

    this.getKey = function() {
        return this.keymap[this.pressKey];
    };

    this.clean = function() {
        return this.pressKey = undefined;
    };
};

Component.Stage = function(canvas, conf) {
    this.keyEvent  = new Keyboard.ControllerEvents();
    this.width     = canvas.width;
    this.height    = canvas.height;
    this.length    = [];
    this.food      = {};
    this.score     = 0;
    this.direction = undefined;
    this.lastDirection = 'right';
    this.conf      = {
        cw   : 16,
        size : 5,
        fps  : 1000
    };

    if (typeof conf == 'object') {
        for (var key in conf) {
            if (conf.hasOwnProperty(key)) {
                this.conf[key] = conf[key];
            }
        }
    }

};

Component.Snake = function(canvas, conf) {
    this.stage = new Component.Stage(canvas, conf);

    this.initSnake = function() {
        for (var i = 0; i < this.stage.conf.size; i++) {
            this.stage.length.push({x: (this.stage.conf.size - i) - 1, y:0});
        }
    };

    this.initSnake();

    this.initFood = function() {
        xPos = Math.round(Math.random() * (this.stage.width - this.stage.conf.cw) / this.stage.conf.cw)
        yPos = Math.round(Math.random() * (this.stage.height - this.stage.conf.cw) / this.stage.conf.cw)

        while(true){
            var fail = false
            for (var i = 0; i < this.stage.length.length; i++) {
                var cell = this.stage.length[i];
                if(cell.x == xPos && cell.y == yPos){
                    fail = true
                    break;
                }
            }

            if(!fail){
                break;
            }

            xPos = Math.round(Math.random() * (this.stage.width - this.stage.conf.cw) / this.stage.conf.cw)
            yPos = Math.round(Math.random() * (this.stage.height - this.stage.conf.cw) / this.stage.conf.cw)
        }

        this.stage.food = {
            x: xPos,
            y: yPos,
        };
    };

    this.initFood();

    this.restart = function() {
        this.stage.length            = [];
        this.stage.food              = {};
        this.stage.score             = 0;
        this.stage.direction         = undefined;
        this.stage.lastDirection     = 'right';
        this.stage.keyEvent.pressKey = null;
        this.initSnake();
        this.initFood();
    };

    this.left = function() {
        if(this.stage.lastDirection == 'right'){
            return;
        }
        this.stage.direction = 'left'
    };

    this.right = function() {
        if(this.stage.lastDirection == 'left'){
            return;
        }
        this.stage.direction = 'right'
    };

    this.up = function() {
        if(this.stage.lastDirection == 'down'){
            return;
        }
        this.stage.direction = 'up'
    };

    this.down = function() {
        if(this.stage.lastDirection == 'up'){
            return;
        }
        this.stage.direction = 'down'
    };
};

Game.Draw = function(context, snake) {
    this.drawStage = function() {
        context.clearRect(0, 0, snake.stage.width, snake.stage.height);

        var keyPress = snake.stage.keyEvent.getKey();

        if(snake.stage.lastDirection != undefined){
            if(opposites[snake.stage.lastDirection] == keyPress){
                keyPress = undefined
            }
        }

        if (typeof(keyPress) != 'undefined') {
            snake.stage.direction = keyPress;
        }

        if (snake.stage.direction != undefined) {
            snake.stage.lastDirection = snake.stage.direction;
        }

        var nx = snake.stage.length[0].x;
        var ny = snake.stage.length[0].y;

        switch (snake.stage.direction) {
            case 'right':
                nx++;
                break;
            case 'left':
                nx--;
                break;
            case 'up':
                ny--;
                break;
            case 'down':
                ny++;
                break;
        }

        if (this.collision(nx, ny) == true) {
            snake.restart();
            return;
        }

        if (nx == snake.stage.food.x && ny == snake.stage.food.y) {
            var tail = {x: nx, y: ny};
            snake.stage.score++;
            snake.initFood();
        } else if(snake.stage.direction !== undefined) {
            var tail = snake.stage.length.pop();
            tail.x   = nx;
            tail.y   = ny;
        }

        if(tail !== undefined){
            snake.stage.length.unshift(tail);
        }

        var lastCell = undefined

        for (var i = 0; i < snake.stage.length.length; i++) {
            var cell = snake.stage.length[i];
            dir = snake.stage.lastDirection

            if(lastCell != undefined){
                xDiff = cell.x - lastCell.x
                yDiff = cell.y - lastCell.y
                if(xDiff == -1){
                    dir = 'right'
                }else if(xDiff == 1){
                    dir = 'left'
                }else if(yDiff == -1){
                    dir = 'down'
                }else if(yDiff == 1){
                    dir = 'up'
                }
            }

            lastCell = cell

            var type = 'head';
            if(i > 0){
                if(i < snake.stage.length.length - 1){
                    type = 'body'
                }else{
                    type = 'tail'
                }
            }
            this.drawCell(cell.x, cell.y, type, dir);
        }

        headPos = snake.stage.length[0]

        switch (snake.stage.lastDirection) {
            default:
                this.drawCell(headPos.x + 1, headPos.y, 'tongue', 'right');
                break;
            case 'left':
                this.drawCell(headPos.x - 1, headPos.y, 'tongue', snake.stage.lastDirection);
                break;
            case 'up':
                this.drawCell(headPos.x, headPos.y - 1, 'tongue', snake.stage.lastDirection);
                break;
            case 'down':
                this.drawCell(headPos.x, headPos.y + 1, 'tongue', snake.stage.lastDirection);
                break;
        }

        this.drawCell(snake.stage.food.x, snake.stage.food.y, 'food');

        context.fillStyle = 'rgb(0, 0, 0)';

        snake.stage.direction = undefined;
        snake.stage.keyEvent.clean();
    };

    this.drawCell = function(x, y, type, direction) {
        context.save();

        var positionX = (x * snake.stage.conf.cw)
        var positionY = (y * snake.stage.conf.cw)

        context.translate(positionX, positionY);

        var offsetX = 1;
        var offsetY = 1;

        if(direction != undefined){
            var rot = 0
            switch(direction){
                case 'up':
                    context.rotate(90*Math.PI/180)
                    offsetX = 1
                    offsetY = -16
                    break;
                case 'right':
                    context.rotate(180*Math.PI/180)
                    offsetX = -16
                    offsetY = -16
                    break;
                case 'down':
                    context.rotate(270*Math.PI/180)
                    offsetX = -16
                    offsetY = 1
                    break;
            }
        }

        if(type == 'head'){
            context.drawImage(headImage, offsetX, offsetY)
        }else if(type == 'body'){
            context.drawImage(bodyImage, offsetX, offsetY)
        }else if(type == 'tail'){
            context.drawImage(tailImage, offsetX, offsetY)
        }else if(type == 'tongue'){
            context.drawImage(tongueImage, offsetX, offsetY)
        }else if(type == 'food'){
            context.drawImage(foodImage, offsetX, offsetY)
        }else{
            context.fillStyle = 'rgb(128, 128, 255)';
            context.beginPath();
            context.arc(8, 8, 8, 0, 2*Math.PI, false);
            context.fill();
        }

        context.restore()
    };

    this.collision = function(nx, ny) {
        if (nx == -1 || ny == -1
            || nx >= (snake.stage.width / snake.stage.conf.cw)
            || ny >= (snake.stage.height / snake.stage.conf.cw)) {
            return true;
        }

        headPos = snake.stage.length[0];

        for (var i = 1; i < snake.stage.length.length; i++) {
            var cell = snake.stage.length[i];
            if(cell.x == headPos.x && cell.y == headPos.y){
                return true;
            }
        }

        return false;
    }
};

Game.Snake = function(elementId, conf) {
    var canvas   = document.getElementById(elementId);
    var context  = canvas.getContext("2d");
    var snake    = new Component.Snake(canvas, conf);
    var gameDraw = new Game.Draw(context, snake);

    setInterval(function() {gameDraw.drawStage();}, snake.stage.conf.fps);

    return {
        'snake': snake
    };
};

snake = new Game.Snake('stage', {fps: 100, size: 4});
var wampClient = new WAMPClient();

function onTwitchSnekCommand(command) {
    snake.snake[command[0]]();
}

function onTwitchSnekMessage(message) {
    document.getElementById("message").innerHTML = message[0];
}

wampClient.execute("subscribe", "TWITCHSNEK:COMMANDS", onTwitchSnekCommand);
wampClient.execute("subscribe", "TWITCHSNEK:MESSAGES", onTwitchSnekMessage);
