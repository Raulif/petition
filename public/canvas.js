
var context = document.getElementById('canvas').getContext("2d");

$('#canvas').mousedown(function(e){
    var mouseX = e.pageX - this.offsetLeft;
    var mouseY = e.pageY - this.offsetTop;

    paint = true;
    addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
    redraw();
})
$('#canvas').mousemove(function(e) {
    if(paint) {
        addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
        redraw();
    }
});

$('#canvas').mouseup(function(e) {
    paint = false;
})

$('#canvas').mouseleave(function(e) {
    paint = false;
})

var clickX = new Array();
var clickY = new Array();
var clickDrag = new Array();
var paint;

function addClick(x, y, dragging) {
    clickX.push(x);
    clickY.push(y);
    clickDrag.push(dragging);
}

function redraw() {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    context.strokeStyle = "#D3852D";
    context.lineJoin = "round";
    context.lineWidth = 4;

    for(var i=0; i< clickX.length; i++) {
        context.beginPath();
        if(clickDrag[i] && i) {
            context.moveTo(clickX[i-1], clickY[i-1]);
        } else {
            context.moveTo(clickX[i]-1, clickY[i]);
        }
        context.lineTo(clickX[i], clickY[i]);
        context.closePath();
        context.stroke();
    }
    $('input[name=signature]').val($('canvas')[0].toDataURL())

}
