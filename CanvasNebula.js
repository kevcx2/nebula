  function CanvasNebula(container, width, height) {
    this.container = container;

    //create and attach canvas to document
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.blankImageData = this.ctx.createImageData(this.imageData);
    this.container.appendChild(this.canvas);
  }

  //Draw a single nebula layer
  CanvasNebula.prototype.render = function(settings){
    var nebRender = new NebulaRenderer(
      this.ctx,
      this.imageData,            //Good Example Values:
      settings.r,                //Math.random(),
      settings.g,                //Math.random(),
      settings.b,                //Math.random(),
      settings.scale,            //Math.max(canvas.width, canvas.height) / 3,
      settings.intensity,        //Math.random() * 0.3 + 1,
      settings.falloff           //Math.random() * 3 + 5
    );

    done = 0;
    while (done < 1) {
      done = nebRender.next();
    }
    this.ctx.putImageData(this.imageData, 0, 0);
  };

  //Reset the canvas to its pre-drawn, clear state
  CanvasNebula.prototype.clear = function () {
    this.imageData = this.ctx.createImageData(this.blankImageData);
    this.ctx.putImageData(this.imageData, 0, 0);
  };

  ////////////////////////////////////////////////////////////////////
  // Nebula Renderer                                               //
  ///////////////////////////////////////////////////////////////////
  var NebulaRenderer = function(ctx, imageData, r, g, b, scale, intensity, falloff) {
      this.ctx = ctx;
      this.imageData = imageData;
      this.r = r;
      this.g = g;
      this.b = b;
      this.scale = scale;
      this.intensity = intensity;
      this.falloff = falloff;

      this.pn = new Perlin("" + Math.random());
      this.iterator = new XYIterator(this.ctx.canvas.width, this.ctx.canvas.height);
  };

  NebulaRenderer.prototype.recursiveField = function(x, y, depth, divisor) {
      if (depth === 0) {
          return this.pn.noise(x / divisor, y / divisor, 0);
      }
      var displace = this.recursiveField(x, y, depth - 1, divisor / 2);
      return this.pn.noise(x / divisor + displace, y / divisor + displace, 0);
  };
  NebulaRenderer.prototype.field = function(x, y, intensity, falloff) {
      var i = Math.min(1, this.recursiveField(x, y, 5, 2) * intensity);
      i = Math.pow(i, falloff);
      return i;
  };

  // Pixel by pixel generation and compositing
  NebulaRenderer.prototype.next = function() {
      var next = this.iterator.next();

      // Use Perlin function to generate pixel alpha
      var pixelAlpha = this.field(next.x / this.scale, next.y / this.scale, this.intensity, this.falloff);

      // Determine imageData array location
      var rowStep = this.imageData.width * 4;
      var imageDataArrayLoc = (next.y * (rowStep)) + (next.x * 4);

      //format new values into RGBA for pixelData
      var newColor = rgba(this.r, this.g, this.b, pixelAlpha);

      // Find currently existing pixel values in imageData
      var oldColorR = this.imageData.data[imageDataArrayLoc + 0];
      var oldColorG = this.imageData.data[imageDataArrayLoc + 1];
      var oldColorB = this.imageData.data[imageDataArrayLoc + 2];
      var oldColorA = this.imageData.data[imageDataArrayLoc + 3];

      // Find composite of old and new RGBA values
      var resultColor = composite(
        oldColorR, oldColorG, oldColorB, oldColorA/255,
        newColor.r, newColor.g, newColor.b, newColor.a
      );

      // Set composite values
      this.imageData.data[imageDataArrayLoc + 0] = resultColor.r;
      this.imageData.data[imageDataArrayLoc + 1] = resultColor.g;
      this.imageData.data[imageDataArrayLoc + 2] = resultColor.b;
      this.imageData.data[imageDataArrayLoc + 3] = resultColor.a * 255;
      return next.done;
  };

  ////////////////////////////////////////////////////////////////////
  // Utility functions                                              //
  ////////////////////////////////////////////////////////////////////
  // Format rgb values for compactness
  var rgba = function(r, g, b, a) {
      r = Math.floor(r * 255);
      g = Math.floor(g * 255);
      b = Math.floor(b * 255);

      return {r: r, g: g, b: b, a: a};
  };

  // Combine two pixel values
  // alpha:
  // αr = αa + αb (1 - αa)
  // resulting color components:
  // Cr = (Ca αa + Cb αb (1 - αa)) / αr
  var composite = function(cbR, cbG, cbB, cbA, caR, caG, caB, caA) {
    crA = caA + cbA * (1 - caA);
    crR = (caR * caA + cbR * cbA * (1 - caA)) / crA;
    crG = (caG * caA + cbG * cbA * (1 - caA)) / crA;
    crB = (caB * caA + cbB * cbA * (1 - caA)) / crA;
    return {r: crR, g: crG, b: crB, a: crA};
  }

  // Optionally scale ImageData for rendering at lower resolutions and scaling back up
  var scaleImageData = function(imageData, scale, ctx) {
      var scaled = ctx.createImageData(imageData.width * scale, imageData.height * scale);
      var subLine = ctx.createImageData(scale, 1).data
      for (var row = 0; row < imageData.height; row++) {
          for (var col = 0; col < imageData.width; col++) {
              var sourcePixel = imageData.data.subarray(
                  (row * imageData.width + col) * 4,
                  (row * imageData.width + col) * 4 + 4
              );
              for (var x = 0; x < scale; x++) subLine.set(sourcePixel, x*4)
              for (var y = 0; y < scale; y++) {
                  var destRow = row * scale + y;
                  var destCol = col * scale;
                  scaled.data.set(subLine, (destRow * scaled.width + destCol) * 4)
              }
          }
      }
      return scaled;
  }

  ////////////////////////////////////////////////////////////////////
  // Iterator                                                       //
  ////////////////////////////////////////////////////////////////////
  var XYIterator = function(width, height) {
      this.width = width;
      this.height = height;
      this.x = -1;
      this.y = 0;
  };

  XYIterator.prototype.next = function() {
      if (this.y == this.height) {
          return {
              x: this.width - 1,
              y: this.width - 1,
              done: 1
          };
      }
      this.x++;
      if (this.x == this.width) {
          this.x = 0;
          this.y++;
      }
      if (this.y == this.height) {
          return {
              x: this.width - 1,
              y: this.width - 1,
              done: 1
          };
      }
      return {
          x: this.x,
          y: this.y,
          done: (this.y * this.width + this.x) / (this.width * this.height)
      };
  };

  ////////////////////////////////////////////////////////////////////
  // Perlin & PRNG                                                  //
  ////////////////////////////////////////////////////////////////////
  function Perlin(seed) {
      var ClassicalNoise = function(r) {
          if (r === undefined) r = Math;
          this.grad3 = [
              [ 1,  1,  0],
              [-1,  1,  0],
              [ 1, -1,  0],
              [-1, -1,  0],
              [ 1,  0,  1],
              [-1,  0,  1],
              [ 1,  0, -1],
              [-1,  0, -1],
              [ 0,  1,  1],
              [ 0, -1,  1],
              [ 0,  1, -1],
              [ 0, -1, -1]
          ];
          this.p = [];
          for (var i = 0; i < 256; i++) {
              this.p[i] = Math.floor(r.random() * 256);
          }
          this.perm = [];
          for (i = 0; i < 512; i++) {
              this.perm[i] = this.p[i & 255];
          }
      };
      ClassicalNoise.prototype.dot = function(g, x, y, z) {
          return g[0] * x + g[1] * y + g[2] * z;
      };
      ClassicalNoise.prototype.mix = function(a, b, t) {
          return (1.0 - t) * a + t * b;
      };
      ClassicalNoise.prototype.fade = function(t) {
          return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
      };
      ClassicalNoise.prototype.noise = function(x, y, z) {
          var X = Math.floor(x);
          var Y = Math.floor(y);
          var Z = Math.floor(z);
          x = x - X;
          y = y - Y;
          z = z - Z;
          X = X & 255;
          Y = Y & 255;
          Z = Z & 255;
          var gi000 = this.perm[X + this.perm[Y + this.perm[Z]]] % 12;
          var gi001 = this.perm[X + this.perm[Y + this.perm[Z + 1]]] % 12;
          var gi010 = this.perm[X + this.perm[Y + 1 + this.perm[Z]]] % 12;
          var gi011 = this.perm[X + this.perm[Y + 1 + this.perm[Z + 1]]] % 12;
          var gi100 = this.perm[X + 1 + this.perm[Y + this.perm[Z]]] % 12;
          var gi101 = this.perm[X + 1 + this.perm[Y + this.perm[Z + 1]]] % 12;
          var gi110 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z]]] % 12;
          var gi111 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z + 1]]] % 12;
          var n000 = this.dot(this.grad3[gi000], x, y, z);
          var n100 = this.dot(this.grad3[gi100], x - 1, y, z);
          var n010 = this.dot(this.grad3[gi010], x, y - 1, z);
          var n110 = this.dot(this.grad3[gi110], x - 1, y - 1, z);
          var n001 = this.dot(this.grad3[gi001], x, y, z - 1);
          var n101 = this.dot(this.grad3[gi101], x - 1, y, z - 1);
          var n011 = this.dot(this.grad3[gi011], x, y - 1, z - 1);
          var n111 = this.dot(this.grad3[gi111], x - 1, y - 1, z - 1);
          var u = this.fade(x);
          var v = this.fade(y);
          var w = this.fade(z);
          var nx00 = this.mix(n000, n100, u);
          var nx01 = this.mix(n001, n101, u);
          var nx10 = this.mix(n010, n110, u);
          var nx11 = this.mix(n011, n111, u);
          var nxy0 = this.mix(nx00, nx10, v);
          var nxy1 = this.mix(nx01, nx11, v);
          var nxyz = this.mix(nxy0, nxy1, w);
          return nxyz;
      };
      var rand = {
          random: Alea(seed)
      };
      var noise = new ClassicalNoise(rand);
      this.noise = function(x, y, z) {
          return 0.5 * noise.noise(x, y, z) + 0.5;
      };
  }

  function Alea() {
      return (function(args) {
          var s0 = 0;
          var s1 = 0;
          var s2 = 0;
          var c = 1;
          if (args.length === 0) {
              args = [+new Date];
          }
          var mash = Mash();
          s0 = mash(' ');
          s1 = mash(' ');
          s2 = mash(' ');
          for (var i = 0; i < args.length; i++) {
              s0 -= mash(args[i]);
              if (s0 < 0) {
                  s0 += 1;
              }
              s1 -= mash(args[i]);
              if (s1 < 0) {
                  s1 += 1;
              }
              s2 -= mash(args[i]);
              if (s2 < 0) {
                  s2 += 1;
              }
          }
          mash = null;
          var random = function() {
              var t = 2091639 * s0 + c * 2.3283064365386963e-10;
              s0 = s1;
              s1 = s2;
              return s2 = t - (c = t | 0);
          };
          random.uint32 = function() {
              return random() * 0x100000000;
          };
          random.fract53 = function() {
              return random() +
                  (random() * 0x200000 | 0) * 1.1102230246251565e-16;
          };
          random.version = 'Alea 0.9';
          random.args = args;
          return random;

      }(Array.prototype.slice.call(arguments)));
  }

  function Mash() {
      var n = 0xefc8249d;

      var mash = function(data) {
          data = data.toString();
          for (var i = 0; i < data.length; i++) {
              n += data.charCodeAt(i);
              var h = 0.02519603282416938 * n;
              n = h >>> 0;
              h -= n;
              h *= n;
              n = h >>> 0;
              h -= n;
              n += h * 0x100000000;
          }
          return (n >>> 0) * 2.3283064365386963e-10;
      };

      mash.version = 'Mash 0.9';
      return mash;
  }
