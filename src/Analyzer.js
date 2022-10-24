// ======================================================//
//														 //
// Design and code by Edoardo Staffa © AVAL audio 2022	 //
//														 //
// ======================================================//

outlets = 3;
var bufLoud = [];
var slice = [];
var thr = 0.5;
var nameBuf = "";
var dullarr = [];
var frames = 0;

function bufScan(s) {
    nameBuf = s;
    var buf = new Buffer(s);
    frames = Math.min(buf.framecount(), 44100*30);
    bufLoud = [];
    dullarr = [];
    slice = [];
    var slide1 = 0;
    var slide2 = 0;
    var mino = 1000;
    var maxo = -1000;
    var samps = 1;
    var old = 0;
    var tmparr = [];
    for (i=0; i<frames; i++) {
        slice[i] = {onset:0, loudn:0, centr:0, size:0};
        with (Math) {
            // y(n) = y(n-1) + (x(n) - y(n-1))/slide
            var val = buf.peek(0, i);
            tmparr[i] = val;
            if (old >= val) {samps = 5;}
            else {samps = 2205;}
            slide1 = slide1+(abs(val)-slide1)/samps;
            slide2 = slide2+(abs(val)-slide2)/4410;
            var fin = slide1-slide2;
            if (fin > maxo) {maxo = fin};
            if (fin < mino) {mino = fin};
            dullarr[i] = fin;
            old = val;
        }
    }
    buf.send("clear");
    buf.send("sizeinsamps", frames);
    buf.poke(0,0,tmparr);
    tmparr = [];
    
    var flag = 0;
    var o_flag = 0;
    var status = 0;
    var duration = 1/(4410*2);
    var count = 0;
    var media = 0;
    var centroid = 0;
    var oi = 0;
    var lmax = -1000;
    var lmin = 1000;
    var cmax = -100000;
    var cmin = 100000;
    var miniArr = [];

    for (i=0; i<frames; i++) {
        dullarr[i] = normalize(dullarr[i], mino, maxo);
        media += dullarr[i];
        miniArr.push(buf.peek(0, i));
        if (dullarr[i] > thr && flag == 0) {flag = 1;}
        if (dullarr[i] < thr*0.3 && flag == 1) {flag = 0;}
        if (status <= 0 && flag!=o_flag) {
            status = 1;
        }
        else if (status > 0) {
            status = status - duration;
        }
        if (status==1 && (i-oi) > 4410*2) {
            if (flag == 1) {
                slice[count].onset = i; 
                media = media/(i-oi);
                if (miniArr.length%2!=0) miniArr.pop();
                centroid = specCentr(miniArr);
                if (media > lmax) {lmax = media};
                if (media < lmin) {lmin = media};
                if (centroid > cmax) {cmax = centroid};
                if (centroid < cmin) {cmin = centroid};
                if (typeof(media) != "number") {media = 0; lmax=0; lmin=0;}
                if (typeof(centroid) != "number") {centroid = 0; cmax=0; cmin=0;}
                slice[count].loudn = media;
                slice[count].centr = centroid;
                slice[count].size = i-oi;
                count += 1;
                media = 0;
                oi = i;
                miniArr = [];
            }
        }
        o_flag = flag;
    }
    var tmp = 0;
    outlet(0, "prepare", count, frames);
    for (i=0; i<count; i++) {
        slice[i].loudn = (normalize(slice[i].loudn, lmin, lmax));
        slice[i].centr = (normalize(slice[i].centr, cmin, cmax));
        var a = slice[i].onset;
        var b = slice[i].loudn;
        var c = slice[i].centr;
        var d = Math.pow(slice[i].size/frames, 0.675);
        outlet(0, "set", a, i);
        outlet(0, "loud", b, i);
        outlet(0, "centr", c, i);
        outlet(0, "sizes", d, i);
    }
    outlet(1, "bang");
}

// ========== FFT analyzer ==================
// http://rosettacode.org/wiki/Fast_Fourier_transform#C.2B.2B
function Complex(re, im)  {
	this.re = re;
	this.im = im || 0.0;
}
Complex.prototype.add = function(other, dst) {
	dst.re = this.re + other.re;
	dst.im = this.im + other.im;
	return dst;
}
Complex.prototype.sub = function(other, dst) {
	dst.re = this.re - other.re;
	dst.im = this.im - other.im;
	return dst;
}
Complex.prototype.mul = function(other, dst) {
	var r = this.re * other.re - this.im * other.im;
	dst.im = this.re * other.im + this.im * other.re;
	dst.re = r;
	return dst;
}
Complex.prototype.cexp = function(dst) {
	var er = Math.exp(this.re);
	dst.re = er * Math.cos(this.im);
	dst.im = er * Math.sin(this.im);
	return dst;
}

function cfft(amplitudes) {
	var N = amplitudes.length;
	if( N <= 1 )
		return amplitudes;
 
	var hN = Math.floor(N / 2);
	var even = [];
	var odd = [];
	even.length = hN;
	odd.length = hN;
	for(var i = 0; i < hN; i++) {
		even[i] = amplitudes[i*2];
		odd[i] = amplitudes[i*2+1];
	}
	even = cfft(even);
	odd = cfft(odd);
 
	var a = -2*Math.PI;
	for(var k = 0; k < hN; k++) {
		if(!(even[k] instanceof Complex))
			even[k] = new Complex(even[k], 0);
		if(!(odd[k] instanceof Complex))
			odd[k] = new Complex(odd[k], 0);
		var p = k/N;
		var t = new Complex(0, a * p);
		t.cexp(t).mul(odd[k], t);
		amplitudes[k] = even[k].add(t, odd[k]);
		amplitudes[k + hN] = even[k].sub(t, even[k]);
	}
	return amplitudes;
}

// ========== spectral centroid =============
function specCentr(a) {
    var lst = cfft(a);
    var sum = 0;
    var weight = 0;
    var real;
    var imag;
    for (var i = 0; i < a.length; i++) {
        real = lst[i].re;
        imag = lst[i].im;
        sum += Math.abs(real*imag);
        weight += Math.abs(imag);
    }
    var res = sum/weight;
    return res;
}

// ========== Utiliy functions ==============
function format(v) {
    return Math.max(atodb(Math.abs(v)), -70);
}

function bang()
{
	outlet(2, buf.length(), buf.framecount(), buf.channelcount());
}

function atodb(v) {
    var base = Math.log(10);
    var dB = 20 * (Math.log(v / 1)/base);
    return dB;
}

function scale(v, min, max, nmin, nmax) {
    var range = nmax-nmin;
    return ((v-min)/(max-min))*range+nmin;
}

function normalize(v, min, max) {
    if (max-min != 0) return ((v-min)/(max-min));
    else return 0;
}

function threshold(v) {
    thr = v;
    if (nameBuf != "") {
        bufScan(nameBuf);
    }
}