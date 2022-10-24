# SliceCream m4l

SliceCream is a M4L virtual instrument that takes a sample as input and, after an onset slicing, centroid and loudness (per slice) analysis, plays a fragment of it trough a 24 channel granulator algorithm.
It also shows the slices as points, in which size depends on duration, x position on loudness and y position on frequency (centroid).

The FFT analysis is obtained as following:

```js
function Complex(re, im) {

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
```

And then the calculation, using a window size equal to the half of the input sample:

```js
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
```

So is the Centroid:

```js
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
```

Using this function on the absolutes values of the samples, is possible to detect the transients:

```js
y(n) = y(n-1) + (x(n) - y(n-1))/slide
```

so the loop:

```js
for (i=0; i<frames; i++) {

	with (Math) {

		var val = buf.peek(0, i);
		
		tmparr[i] = val;
		
		if (old >= val) samps = 5;
		
		else samps = 2205;
		
		slide1 = slide1+(abs(val)-slide1)/samps;
		
		slide2 = slide2+(abs(val)-slide2)/4410;
		
		var fin = slide1-slide2;
		
		if (fin > maxo) maxo = fin;
		
		if (fin < mino) mino = fin;
		
		dullarr[i] = fin;
		
		old = val;
	
	}

}
```

Then the loudness values are normalized, as well as centroid values in order to be shown by the JSUI object.  

For more check the [source code](src/Analyzer.js).

## UI
The UI is made using part of the Ableton Max externals (like dials, and gain control) but mostly using JSUI, an external that allows to draw interactive elements on screen. 
By dragging on the interface you can choose which slice to pass to the granulator, or you can do it automatically by switchin the LFO (on / off) that has a variable speed.

![](imgs/Schermata%202022-10-25%20alle%2000.29.32.png)

The "Threshold" value allows to adjust the onset trigger threshold, and by clicking "Grain" is possible to change the grain envelope.

![](imgs/Schermata%202022-10-25%20alle%2000.31.10.png)

For more check the [source code](src/JSUI.js).

## Audio

The grainulator algorithm accept samples with 30s max duration and is made using GenExpr:

``` c
readbf(x, bff, wndw, rl, rr, chns, st, end) {
	left = wave(bff, x, st, end, chns*0, interp="cubic", boundmode="ignore")*wndw*rl;
	right = wave(bff, x, st, end, chns, interp="cubic", boundmode="ignore")*wndw*rr;
	return left, right;
}

tosamps(arg,sr) {
	return arg/1000*sr;
}

//30s max duration
Data smp1(44100*30);
Data env(2048);

//Variables
History start(0);
History nota1(1);
History dyn1(1);
History offset(0);
History L1(100);
History effend1(0);
History effst1(0);
History effdur1(0);
History smallest(pow(2,-32));
History randR1(1);
History randL1(1);
History unique1(0);
History lenght1(0);
History sx1(2);
History acstop(0);

Param midinote(60, min=1, max=127);
Param vel(127, min=0, max=127);
Param smpstart1(0, min=0);
Param smpend1(4410, min=0);
Param srsample1(44100);
Param x1(2, min=0, max=8);
Param stops(0, min=0, max=1);

val = 0.5;

aL, aR = 0;
if (start == 0) {
	smallest = pow(2,-32);		
	lenght1 = srsample1;
	unique1 = scale(noise(123+mc_channel), -1, 1, 0, 999);	
	effst1 = 0;
	effend1 = dim(smp1);
	effdur1 = clip(effend1-effst1, smallest, dim(smp1));
	L1 = 100;
	start = 1;
}

phsr1 = (phasor(L1));
window1 = wave(env, phsr1, 0, 2048, 0, interp="cubic", boundmode="ignore")*acstop;
canali1 = channels(smp1)-1;
aL, aR = readbf(phsr1, smp1, window1, randL1, randR1, canali1, effst1, effend1); 
out1, out2 = readbf(phsr1, smp1, window1, randL1, randR1, canali1, effst1, effend1); 
out3 = window1;
out4 = offset;

if (delta(phsr1) < 0) {
	effst1 = clip(smpstart1, 0, dim(smp1)-1);
	effend1 = clip(smpend1, 1, dim(smp1));
	effdur1 = clip(effend1-effst1, smallest, dim(smp1));
	nota1 = pow(2, (midinote-60)/12);
	dyn1 = vel/127;
	L1 = clip(1/(effdur1/lenght1)*nota1, smallest, 10000);
	offset = (1/8)*mc_channel*effdur1;
	acstop = stops;
}


if (delta(phsr1) < 0 && effdur1 > mstosamps(1000/20)) {
	val = clip(noise(unique1)*0.5+0.5, 0, 1);
	randL1 = (sqrt(1-val));
	randR1 = (sqrt(val));
}
```