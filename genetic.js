(function() {

  function Genetic(max, variance) {
    this.max = max;
    this.variance = variance;
    this.lineage = [];
  }

  Genetic.prototype.peek = function() {
    return this.lineage[0];
  };

  Genetic.prototype.size = function() {
    return this.lineage.length;
  };

  Genetic.prototype.seed = function(num) {
    for (var i = 0; i < num; i++) {
      var obj = {};
      for (var key in this.max) {
        if (this.max.hasOwnProperty(key)) {
          obj[key] = Math.random() * this.max[key]; 
        }
      }
      this.lineage.push(obj);
    }
  };

  Genetic.prototype.excel = function() {
    var parent = this._next();
    this.lineage.push(this._evolve(parent));
    this.lineage.push(this._evolve(parent));
  };

  Genetic.prototype.survive = function() {
    return this.lineage.push(this._evolve(this._next()));
  };

  Genetic.prototype.die = function() {
    return this._next();
  };

  Genetic.prototype._evolve = function(parent) {
    var evolved = {};

    for (var key in parent) {
      if (parent.hasOwnProperty(key)) {
        var dist = gaussian(parent[key], this.variance[key]);
        var attr = dist.ppf(Math.random());

        attr = Math.max(0, Math.min(attr, this.max[key]));
        evolved[key] = attr;
      }
    }

    return evolved;
  };

  Genetic.prototype._next = function() {
    return this.lineage.shift();
  };

  var current = {
    r: 100,
    g: 100,
    b: 80,
    scale: 10,
    intensity: 10,
    falloff: 5
  };

  var max = {
    r: 255,
    g: 255,
    b: 255,
    scale: 500,
    intensity: 3,
    falloff: 10
  };

  var variance = {
    r: 100,
    g: 100,
    b: 100,
    scale: 100,
    intensity: 1,
    falloff: 2
  };

  window.genetic = new Genetic(max, variance);
  window.genetic.seed(10);
})();
