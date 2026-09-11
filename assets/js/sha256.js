(function () {
  'use strict';

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  var INITIAL = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

  function add32() {
    var result = 0;
    for (var i = 0; i < arguments.length; i += 1) {
      result = (result + (arguments[i] >>> 0)) >>> 0;
    }
    return result;
  }

  function smallSigma0(x) { return (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0; }
  function smallSigma1(x) { return (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0; }
  function bigSigma0(x) { return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0; }
  function bigSigma1(x) { return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0; }
  function choose(x, y, z) { return ((x & y) ^ (~x & z)) >>> 0; }
  function majority(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)) >>> 0; }
  function hex32(x) { return (x >>> 0).toString(16).padStart(8, '0'); }

  function traceOneBlock(message) {
    var bytes = new TextEncoder().encode(message);
    if (bytes.length > 55) {
      throw new Error('The round visualizer accepts at most 55 UTF-8 bytes so the message fits in one block.');
    }

    var block = new Uint8Array(64);
    block.set(bytes);
    block[bytes.length] = 0x80;
    var bitLength = bytes.length * 8;
    var view = new DataView(block.buffer);
    view.setUint32(56, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(60, bitLength >>> 0, false);

    var w = new Uint32Array(64);
    for (var i = 0; i < 16; i += 1) w[i] = view.getUint32(i * 4, false);
    for (var t = 16; t < 64; t += 1) {
      w[t] = add32(smallSigma1(w[t - 2]), w[t - 7], smallSigma0(w[t - 15]), w[t - 16]);
    }

    var a = INITIAL[0];
    var b = INITIAL[1];
    var c = INITIAL[2];
    var d = INITIAL[3];
    var e = INITIAL[4];
    var f = INITIAL[5];
    var g = INITIAL[6];
    var h = INITIAL[7];
    var rounds = [];

    for (var round = 0; round < 64; round += 1) {
      var t1 = add32(h, bigSigma1(e), choose(e, f, g), K[round], w[round]);
      var t2 = add32(bigSigma0(a), majority(a, b, c));
      h = g;
      g = f;
      f = e;
      e = add32(d, t1);
      d = c;
      c = b;
      b = a;
      a = add32(t1, t2);
      rounds.push({ w: w[round], k: K[round], t1: t1, t2: t2, state: [a, b, c, d, e, f, g, h] });
    }
    return rounds;
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  function hexToBits(hex) {
    var bits = [];
    for (var i = 0; i < hex.length; i += 1) {
      var nibble = parseInt(hex[i], 16);
      bits.push((nibble >> 3) & 1, (nibble >> 2) & 1, (nibble >> 1) & 1, nibble & 1);
    }
    return bits;
  }

  function setupAvalancheDemo() {
    var root = document.getElementById('avalanche-demo');
    if (!root) return;
    var inputA = document.getElementById('hash-a');
    var inputB = document.getElementById('hash-b');
    var digestA = document.getElementById('digest-a');
    var digestB = document.getElementById('digest-b');
    var score = document.getElementById('avalanche-score');
    var grid = document.getElementById('bit-grid');
    var updateNumber = 0;

    async function update() {
      var thisUpdate = ++updateNumber;
      if (!window.crypto || !window.crypto.subtle) {
        score.textContent = 'Web Crypto unavailable';
        return;
      }
      var encoder = new TextEncoder();
      var hashes = await Promise.all([
        crypto.subtle.digest('SHA-256', encoder.encode(inputA.value)),
        crypto.subtle.digest('SHA-256', encoder.encode(inputB.value))
      ]);
      if (thisUpdate !== updateNumber) return;
      var first = bytesToHex(hashes[0]);
      var second = bytesToHex(hashes[1]);
      var bitsA = hexToBits(first);
      var bitsB = hexToBits(second);
      var difference = 0;
      digestA.textContent = first;
      digestB.textContent = second;
      grid.replaceChildren();
      bitsA.forEach(function (bit, index) {
        var changed = bit !== bitsB[index];
        if (changed) difference += 1;
        var cell = document.createElement('i');
        cell.className = 'hash-bit' + (changed ? ' is-different' : '');
        cell.style.setProperty('--bit', index);
        cell.title = 'bit ' + index + ': ' + (changed ? 'different' : 'same');
        grid.appendChild(cell);
      });
      score.textContent = difference + ' / 256 bits differ · ' + (difference / 2.56).toFixed(1) + '%';
    }

    var timer;
    function queueUpdate() {
      clearTimeout(timer);
      timer = setTimeout(update, 120);
    }
    inputA.addEventListener('input', queueUpdate);
    inputB.addEventListener('input', queueUpdate);
    update();
  }

  function setupRoundDemo() {
    var root = document.getElementById('round-demo');
    if (!root) return;
    var message = document.getElementById('trace-message');
    var slider = document.getElementById('round-slider');
    var play = document.getElementById('round-play');
    var reset = document.getElementById('round-reset');
    var label = document.getElementById('round-label');
    var error = document.getElementById('trace-error');
    var stateBox = root.querySelector('.state-words');
    var wordNodes = root.querySelectorAll('[data-word]');
    var rounds = [];
    var interval;

    function stop() {
      clearInterval(interval);
      interval = null;
      play.textContent = 'Play 64 rounds';
    }

    function render(index) {
      if (!rounds.length) return;
      var data = rounds[index];
      slider.value = index;
      label.textContent = 'Round ' + index + ' / 63';
      document.getElementById('round-w').textContent = hex32(data.w);
      document.getElementById('round-k').textContent = hex32(data.k);
      document.getElementById('round-t1').textContent = hex32(data.t1);
      document.getElementById('round-t2').textContent = hex32(data.t2);
      wordNodes.forEach(function (node, i) { node.textContent = hex32(data.state[i]); });
      stateBox.classList.remove('is-updated');
      void stateBox.offsetWidth;
      stateBox.classList.add('is-updated');
    }

    function rebuild() {
      stop();
      try {
        rounds = traceOneBlock(message.value);
        error.textContent = '';
        slider.disabled = false;
        play.disabled = false;
        render(0);
      } catch (problem) {
        rounds = [];
        error.textContent = problem.message;
        slider.disabled = true;
        play.disabled = true;
      }
    }

    play.addEventListener('click', function () {
      if (interval) { stop(); return; }
      if (Number(slider.value) >= 63) render(0);
      play.textContent = 'Pause';
      interval = setInterval(function () {
        var next = Number(slider.value) + 1;
        if (next > 63) { stop(); return; }
        render(next);
      }, 520);
    });
    reset.addEventListener('click', function () { stop(); render(0); });
    slider.addEventListener('input', function () { stop(); render(Number(slider.value)); });
    message.addEventListener('input', rebuild);
    rebuild();
  }

  setupAvalancheDemo();
  setupRoundDemo();
})();
