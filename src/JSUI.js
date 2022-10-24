// ======================================================//
//														 //
// Design and code by Edoardo Staffa © AVAL audio 2022	 //
//														 //
// ======================================================//

mgraphics.init();
mgraphics.relative_coords = 1;
mgraphics.autofill = 0;

outlets = 4;
var slice = [];
var width = box.rect[2] - box.rect[0];
var heigth = box.rect[3] - box.rect[1];
var prop = width/heigth;
var howm = 0;
var aa = 0;
var ff = 0;
var select = [];
var mouse = {x: -2, y: -2, siz: 1};

function paint()
{
	width = box.rect[2] - box.rect[0];
	heigth = box.rect[3] - box.rect[1];
    prop = width/heigth;
	
	with (mgraphics) {
        set_source_rgb(0.11,0.11,0.11);
		rectangle_rounded(-prop,1,prop*2,2,0.5,0.5);
		fill();
        set_line_width(1.5*0.02);
        set_source_rgba(0.99,0.96,0.89,1);
        ellipse(mouse.x-0.06*mouse.siz, mouse.y+0.06*mouse.siz, 0.06*2*mouse.siz, 0.06*2*mouse.siz);
        fill();
        set_source_rgba(0,0,0,1);
        ellipse(mouse.x-0.06*mouse.siz, mouse.y+0.06*mouse.siz, 0.06*2*mouse.siz, 0.06*2*mouse.siz);
        stroke();
        var lx;
        var ly;
        for (i=0; i<howm; i++) {
            var clx = Math.floor(slice[i].loud*4)/4;
		    var cly = Math.floor(slice[i].centr*4)/4;
		    var clm = Math.pow(1-slice[i].loud, 0.5);
		    var color = [clx*0.957, Math.pow(slice[i].size,2)*40*0.74 + 0.261, 0.691+cly*0.31, 1];
            set_source_rgba(color);
            if (i>0) {
                set_line_width(1.5*0.015*((i/howm)+0.3));
                move_to(lx, ly);
                line_to((slice[i].loud*1.8-0.9)*prop, (1-slice[i].centr)*1.8-0.9);
                stroke()
            }
            lx = (slice[i].loud*1.8-0.9)*prop;
            ly = (1-slice[i].centr)*1.8-0.9;
        }
        set_line_width(1.5*0.015);
        for (i=0; i<howm; i++) {
            var clx = Math.floor(slice[i].loud*4)/4;
		    var cly = Math.floor(slice[i].centr*4)/4;
		    var clm = Math.pow(1-slice[i].loud, 0.5);
		    var color = [clx*0.957, Math.pow(slice[i].size,2)*40*0.74 + 0.261, 0.691+cly*0.31, 1];
            set_source_rgba(color);
            var osiz = (Math.min(Math.pow(slice[i].size,2.125)*3+0.03, 0.1)+select[i])*2;
            ellipse((slice[i].loud*1.8-0.9)*prop-osiz*0.5, (1-slice[i].centr)*1.8-0.9+osiz*0.5, osiz, osiz);
            fill();
            set_source_rgba(0,0,0,1);
            ellipse((slice[i].loud*1.8-0.9)*prop-osiz*0.5, (1-slice[i].centr)*1.8-0.9+osiz*0.5, osiz, osiz);
            stroke();

        }
	}
}

function bang() {
    mgraphics.redraw();
}

function extv(pex, pey) {
    mouse.x = pex*prop;
    mouse.y = pey;
    mouse.siz = 1.5;
    finder(pex*prop,pey);
    bang();
}

function finder(x, y) {
    x = Math.min(Math.max(((x/width)*2*prop-prop), -prop), prop);
    y = Math.min(Math.max((1-y/heigth)*1.8-0.9, -1), 1);
    select = select.map(zero);
	for (i=0; i<howm; i++) {
        valore = slice[i].onset;
        mx = (slice[i].loud*1.8-0.9)*prop;
        my = (1-slice[i].centr)*1.8-0.9;
        dist = Math.sqrt(Math.pow(mx-x, 2) + Math.pow(my-y, 2));
        am = Math.min(Math.pow(slice[i].size,2.125)*3+0.06, 0.1);
        if (dist < am*1.7) {
            outlet(1, "stops", 1);
            if (aa != slice[i].onset) {
                if (slice[i].onset > aa) {
                    outlet(0, aa, slice[i].onset); 
                    select[i] = 0.03;
                }
                else {
                    outlet(0, 0, slice[i].onset); 
                    select[i] = 0.03;
                }
            }
            break;
        }
        else {outlet(1, "stops", 0);}
        aa = valore;
    }
}

function onclick(x,y,but,cmd,shift,capslock,option,ctrl) {
    finder(x,y);
    mouse.siz = 2;
    outlet(2, 2*x/width-1);
    outlet(3, 2*y/heigth-1);
}

function ondrag(x,y,but,cmd,shift,capslock,option,ctrl)
{
    mouse.x = x/width*2*prop-prop;
    mouse.y = (1-y/heigth)*2-1;
    mouse.siz = 2;
    finder(x,y);
    bang();
    outlet(2, 2*x/width-1);
    outlet(3, 2*y/heigth-1);
}
ondrag.local = 1; //private

function onidle(x,y,but,cmd,shift,capslock,option,ctrl)
{
    mouse.x = x/width*2*prop-prop;
    mouse.y = (1-y/heigth)*2-1;
    mouse.siz = 1.5;
    bang();
}
ondrag.local = 1;

function onidleout(x,y,but,cmd,shift,capslock,option,ctrl)
{
    mouse.siz = 0;
    bang();
}
ondrag.local = 1;

function forcesize(w,h)
{
	if (w!=h) {
		h = w;
		box.size(w,h);
	}
}
forcesize.local = 1; //private

function onresize(w,h)
{
	//forcesize(w,h);
	width = w;
	height = h;
	draw();
	refresh();
}
onresize.local = 1; //private

function set(v, i) {
    slice[i].onset = v;
}
function loud(v, i) {
    slice[i].loud = v;
}
function centr(v, i) {
    slice[i].centr = v;
}
function sizes(v, i) {
    slice[i].size = v;
    if (i==howm) bang();
}

function prepare(v, frames) {
    howm = v;
    ff = frames;
    for (j=0; j<howm; j++) {
        slice[j] = {onset:0, loudn:0, centr:0, size:0};
        select[j] = 0;
    }
}

function posizLFO() {
    var i = Math.floor(Math.random()*howm);
    select = select.map(zero);
    if (i!=0) outlet(0, slice[i-1].onset, slice[i].onset); 
    else outlet(0, 0, slice[i].onset); 
    outlet(1, "stops", 1);
    select[i] = 0.03;
    mouse.x = (slice[i].loud*1.8-0.9)*prop;
    mouse.y = (1-slice[i].centr)*1.8-0.9;
    bang();
}

function zero (value, index, array) {
    return value*0;
}

