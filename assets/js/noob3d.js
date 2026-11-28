/* =====================================================================
   Renovu – visualizador 3D do noob (WebGL puro, sem bibliotecas)
   Lê o modelo original /assets/noob/scene.gltf (+ scene.bin + textura).
   Ele fica PARADO na pose padrão e só gira quando o usuário arrasta.
   ===================================================================== */
(function () {
  'use strict';

  var BASE = '/assets/noob/';

  // Pose padrão: 3/4, câmera acima, igual à miniatura de referência
  // (valores medidos: a silhueta do modelo fica 99% igual à imagem de referência)
  var POSE = { yaw: -26.6, pitch: 23.8, cy: -0.04, size: 7.01, fov: 70.8 };
  // Foto de rosto (cabeça + ombros), usada nos círculos de perfil/amigos
  var HEAD = { yaw: -4, pitch: 4, cy: 1.93, size: 2.45, fov: 28 };

  var modelPromise = null;

  /* ------------------------------ modelo ------------------------------ */
  function loadModel() {
    if (modelPromise) return modelPromise;
    modelPromise = Promise.all([
      fetch(BASE + 'scene.gltf').then(function (r) { return r.json(); }),
      fetch(BASE + 'scene.bin').then(function (r) { return r.arrayBuffer(); }),
      new Promise(function (ok, fail) {
        var im = new Image();
        im.onload = function () { ok(im); };
        im.onerror = fail;
        im.src = BASE + 'textures/N00b1Mtl_baseColor.png';
      })
    ]).then(function (a) {
      var g = a[0], bin = a[1], tex = a[2];
      var prim = g.meshes[0].primitives[0];

      function read(ai, comps, Type) {
        var A = g.accessors[ai], V = g.bufferViews[A.bufferView];
        var off = (V.byteOffset || 0) + (A.byteOffset || 0);
        var bytes = (Type === Uint32Array ? 4 : 4) * comps;
        var stride = V.byteStride || bytes;
        var dv = new DataView(bin);
        var out = new (Type === Uint32Array ? Uint32Array : Float32Array)(A.count * comps);
        for (var i = 0; i < A.count; i++) {
          for (var c = 0; c < comps; c++) {
            var p = off + i * stride + c * 4;
            out[i * comps + c] = Type === Uint32Array ? dv.getUint32(p, true) : dv.getFloat32(p, true);
          }
        }
        return out;
      }

      var P = read(prim.attributes.POSITION, 3);
      var N = read(prim.attributes.NORMAL, 3);
      var T = read(prim.attributes.TEXCOORD_0, 2);
      var I = read(prim.indices, 1, Uint32Array);
      var n = P.length / 3;

      // o modelo vem com Z para cima; o WebGL usa Y para cima:  (x, y, z) -> (x, z, -y)
      var min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9], i, k;
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      for (i = 0; i < n; i++) {
        pos[i * 3] = P[i * 3]; pos[i * 3 + 1] = P[i * 3 + 2]; pos[i * 3 + 2] = -P[i * 3 + 1];
        nor[i * 3] = N[i * 3]; nor[i * 3 + 1] = N[i * 3 + 2]; nor[i * 3 + 2] = -N[i * 3 + 1];
        for (k = 0; k < 3; k++) {
          if (pos[i * 3 + k] < min[k]) min[k] = pos[i * 3 + k];
          if (pos[i * 3 + k] > max[k]) max[k] = pos[i * 3 + k];
        }
      }
      var ctr = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
      var data = new Float32Array(n * 8);
      for (i = 0; i < n; i++) {
        data[i * 8] = pos[i * 3] - ctr[0];
        data[i * 8 + 1] = pos[i * 3 + 1] - ctr[1];
        data[i * 8 + 2] = pos[i * 3 + 2] - ctr[2];
        data[i * 8 + 3] = nor[i * 3]; data[i * 8 + 4] = nor[i * 3 + 1]; data[i * 8 + 5] = nor[i * 3 + 2];
        // a textura deste modelo (export do Sketchfab) vem com o V invertido
        data[i * 8 + 6] = T[i * 2]; data[i * 8 + 7] = 1 - T[i * 2 + 1];
      }
      // --- partes do corpo (cabeça, tronco, braços, pernas): cada uma é um componente separado ---
      var par = []; for (i = 0; i < n; i++) par[i] = i;
      function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
      for (i = 0; i < I.length; i += 3) { par[find(I[i])] = find(I[i + 1]); par[find(I[i + 1])] = find(I[i + 2]); }
      var comp = {};
      for (i = 0; i < n; i++) {
        var r = find(i), c = comp[r] || (comp[r] = { y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 });
        // coordenadas originais do glTF: y = lateral, z = altura
        c.y0 = Math.min(c.y0, P[i * 3 + 1]); c.y1 = Math.max(c.y1, P[i * 3 + 1]);
        c.z0 = Math.min(c.z0, P[i * 3 + 2]); c.z1 = Math.max(c.z1, P[i * 3 + 2]);
      }
      Object.keys(comp).forEach(function (key) {
        var c = comp[key], cy = (c.y0 + c.y1) / 2, cz = (c.z0 + c.z1) / 2;
        c.part = cz > 4.2 ? 'head' : cy < 1 ? 'armP' : cy > 3 ? 'armN' : (c.y1 - c.y0) > 1.5 ? 'torso' : cy < 2 ? 'legP' : 'legN';
      });
      var ORDER = ['torso', 'head', 'armP', 'armN', 'legP', 'legN'], tris = [];
      for (i = 0; i < I.length; i += 3) tris.push({ p: ORDER.indexOf(comp[find(I[i])].part), a: I[i], b: I[i + 1], c: I[i + 2] });
      tris.sort(function (u, v) { return u.p - v.p; });
      var idx = new Uint16Array(I.length), parts = {}, t;
      for (t = 0; t < tris.length; t++) {
        idx[t * 3] = tris[t].a; idx[t * 3 + 1] = tris[t].b; idx[t * 3 + 2] = tris[t].c;
        var nm = ORDER[tris[t].p]; (parts[nm] || (parts[nm] = { start: t * 3, count: 0 })).count += 3;
      }
      // articulações no sistema do modelo já centralizado (x = profundidade, y = altura, z = lado)
      var shoulderY = 4 - ctr[1], hipY = 2 - ctr[1];
      function lat(rawY) { return -rawY - ctr[2]; }       // y lateral do glTF -> z do modelo centralizado
      var pivots = {
        torso: [0, hipY, 0], head: [0, shoulderY, 0], body: [0, hipY, 0],
        armP: [0, shoulderY, lat(1)], armN: [0, shoulderY, lat(3)],
        legP: [0, hipY, lat(1.5)], legN: [0, hipY, lat(2.5)]
      };
      return { data: data, indices: idx, tex: tex, parts: parts, pivots: pivots };
    });
    return modelPromise;
  }

  /* ------------------------------ matrizes ---------------------------- */
  function mul(a, b) { // coluna-maior: a * b
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
  function rotX(t) { var c = Math.cos(t), s = Math.sin(t); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
  function rotY(t) { var c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
  function rotZ(t) { var c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function trans(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }
  function persp(fov, asp, n, f) {
    var t = 1 / Math.tan(fov / 2);
    return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]);
  }
  var RAD = Math.PI / 180;
  // rotação de uma peça em torno da articulação: Rz * Ry * Rx (graus)
  function limb(a) { return mul(rotZ((a[2] || 0) * RAD), mul(rotY((a[1] || 0) * RAD), rotX((a[0] || 0) * RAD))); }
  function around(R, p) { return mul(trans(p[0], p[1], p[2]), mul(R, trans(-p[0], -p[1], -p[2]))); }

  /* ------------------------------ shaders ----------------------------- */
  var VS = 'attribute vec3 aP;attribute vec3 aN;attribute vec2 aT;' +
    'uniform mat4 uMVP;uniform mat4 uR;varying vec3 vN;varying vec2 vT;' +
    'void main(){vN=(uR*vec4(aN,0.0)).xyz;vT=aT;gl_Position=uMVP*vec4(aP,1.0);}';
  var FS = 'precision mediump float;varying vec3 vN;varying vec2 vT;uniform sampler2D uTex;' +
    'void main(){vec3 n=normalize(vN);' +
    'float key=max(dot(n,normalize(vec3(-0.35,0.55,0.75))),0.0);' +
    'float fill=max(dot(n,normalize(vec3(0.75,0.15,0.35))),0.0);' +
    'float k=0.56+0.40*key+0.12*fill+0.06*n.y;' +
    'gl_FragColor=vec4(texture2D(uTex,vT).rgb*k,1.0);}';

  /* ------------------------------ viewer ------------------------------ */
  // opts: { view:{yaw,pitch,cy,size,fov}, preserve:bool, heightScale:number }
  function create(canvas, opts) {
    opts = opts || {};
    var view = {}, base = opts.view || POSE, k;
    for (k in base) view[k] = base[k];
    var yawTarget = view.yaw, yawCur = view.yaw, raf = 0, dead = false, model = null, pose = opts.pose || null;
    var gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: !!opts.preserve }) ||
             canvas.getContext('experimental-webgl', { antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
    if (!gl) return null;

    var prog, loc = {}, buf, ibuf, texture, count = 0;

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }

    var api = {
      view: view,
      ready: loadModel().then(function (m) {
        if (dead) return api;
        model = m;
        prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        ['aP', 'aN', 'aT'].forEach(function (a) { loc[a] = gl.getAttribLocation(prog, a); });
        ['uMVP', 'uR', 'uTex'].forEach(function (u) { loc[u] = gl.getUniformLocation(prog, u); });

        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, m.data, gl.STATIC_DRAW);
        ibuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW);
        count = m.indices.length;

        texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.tex);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        var ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
        gl.enable(gl.DEPTH_TEST);
        draw();
        return api;
      })
    };

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h && (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr))) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
    }

    function draw() {
      if (!model || dead) return;
      size();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      var asp = canvas.width / canvas.height;
      var fov = view.fov * RAD;
      // altura visível do mundo (em unidades do modelo)
      var vis = view.size * (opts.heightScale || 1);
      var dist = (vis / 2) / Math.tan(fov / 2);
      var rot = mul(rotX(view.pitch * RAD), rotY((yawCur + 90) * RAD)); // o rosto do modelo aponta para -x
      var cam = mul(trans(0, 0, -dist), mul(rot, trans(0, -view.cy, 0)));
      var proj = persp(fov, asp, dist * 0.2, dist * 3);

      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
      gl.enableVertexAttribArray(loc.aP); gl.vertexAttribPointer(loc.aP, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(loc.aN); gl.vertexAttribPointer(loc.aN, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(loc.aT); gl.vertexAttribPointer(loc.aT, 2, gl.FLOAT, false, 32, 24);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(loc.uTex, 0);

      var body = pose && pose.body ? limb(pose.body) : null;
      Object.keys(model.parts).forEach(function (name) {
        var pt = model.parts[name], a = pose && pose[name];
        var R = a ? limb(a) : null, W = null;
        if (R) W = around(R, model.pivots[name]);
        if (body) W = W ? mul(around(body, model.pivots.body), W) : around(body, model.pivots.body);
        var RR = R && body ? mul(body, R) : (R || body);
        gl.uniformMatrix4fv(loc.uMVP, false, mul(proj, W ? mul(cam, W) : cam));
        gl.uniformMatrix4fv(loc.uR, false, RR ? mul(rot, RR) : rot);
        gl.drawElements(gl.TRIANGLES, pt.count, gl.UNSIGNED_SHORT, pt.start * 2);
      });
    }

    function tick() {
      raf = 0;
      var d = yawTarget - yawCur;
      if (Math.abs(d) < 0.05) { yawCur = yawTarget; draw(); return; }
      yawCur += d * 0.25;           // suaviza o arrasto (sem "pular")
      draw();
      raf = requestAnimationFrame(tick);
    }

    api.setYaw = function (deg, instant) {
      yawTarget = deg;
      if (instant) yawCur = deg;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    api.getYaw = function () { return yawTarget; };
    api.draw = draw;
    api.setPose = function (p) { pose = p || null; draw(); };
    api.resetPose = function () { yawTarget = base.yaw; yawCur = base.yaw; draw(); };
    api.destroy = function () {
      dead = true; if (raf) cancelAnimationFrame(raf);
      var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
    };
    return api;
  }

  window.Noob3D = { create: create, POSE: POSE, HEAD: HEAD, preload: loadModel };
})();
