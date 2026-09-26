uniform float uTime;
uniform vec4 uA;
uniform vec4 uB;
uniform vec3 uC1;
uniform vec3 uC2;
uniform float uSeed;
float gPx = .002;
float gHatch = 0.;
float gHS = 0.;
float gHatch2 = 0.;
float gHS2 = 0.;
float gInk = 0.;
float gPop = 0.;

vec3 starCell(vec2 p, float cells, float prob, float seed, float sizeK){
  vec2 g = p*cells;
  vec2 id = floor(g);
  vec2 f = fract(g);
  float h = hash12(id + seed);
  if (h > prob) return vec3(0.);
  vec2 sp = .22 + .56*hash22(id + seed + 17.3);
  float m = hash12(id*1.37 + seed + 4.1);
  float d = length(f - sp)/cells;
  float sz0 = (.0022 + .0075*m*m*m)*sizeK;
  float sz = max(sz0, gPx*.9);
  float tw = .78 + .22*sin(uTime*(.7 + 2.3*m) + h*57.);
  float core = exp(-d*d/(sz*sz));
  vec3 c = mix(vec3(.72, .82, 1.), vec3(1., .84, .66), hash12(id + seed + 9.9));
  return c*core*(.25 + 2.3*m*m*m)*min(1., sz0/sz*1.4)*tw;
}
vec3 starfield(vec2 p, float dens){
  vec3 s = starCell(p, 9., .32*dens, 1.3, 1.25);
  s += starCell(p, 21., .26*dens, 7.7, .8);
  s += starCell(p, 47., .2*dens, 3.1, .55);
  return s;
}
vec3 spaceBg(vec2 p){
  float n = fbm3v(p*1.3 + uSeed*3.1);
  float n2 = fbm3v(p*2.7 - uSeed);
  vec3 c = vec3(.0025, .0035, .008);
  c += vec3(.012, .008, .022)*smoothstep(.35, .8, n);
  c += vec3(.004, .01, .016)*smoothstep(.45, .85, n2);
  return c;
}
float spikeF(vec2 q, float len, float w){
  float s = 0.;
  for (int i = 0; i < 2; i++){
    vec2 d = rot2(q, float(i)*PI*.5 + .2);
    s += exp(-abs(d.y)/(w + abs(d.x)*.012))*exp(-abs(d.x)/len);
  }
  return s;
}
vec3 brightStar(vec2 q, vec2 c, float b, vec3 tint, float spk){
  vec2 d = q - c; float r2 = dot(d, d);
  float sz0 = .004 + .007*b;
  float sz = max(sz0, gPx);
  float core = exp(-r2/(sz*sz));
  float halo = exp(-r2/(sz*sz*30.))*.25;
  float sp = spk > 0. ? spikeF(d, .05 + .12*b, .0012)*b*spk : 0.;
  return tint*(core*(1.5 + 3.*b)*min(1., sz0/sz*1.3) + halo*b + sp*.8);
}

// ============================ PLANÈTES ============================
#if ART == 1
float craters(vec3 p){
  vec3 b = floor(p - .5);
  float acc = 0.;
  for (int k = 0; k < 8; k++){
    vec3 cell = b + vec3(float(k & 1), float((k >> 1) & 1), float((k >> 2) & 1));
    vec3 h = hash33(cell);
    if (h.z < .35) continue;
    vec3 c = cell + .5 + (h - .5)*.5;
    float rad = .14 + .3*h.x*h.x;
    float d = length(p - c)/rad;
    acc += exp(-pow((d - 1.)*6., 2.))*.55 - smoothstep(1., .72, d)*.35;
  }
  return acc;
}
float ringDens(float r){
  float d = 0.;
  d += smoothstep(1.24, 1.27, r)*(1. - smoothstep(1.51, 1.53, r))*.3;
  d += smoothstep(1.52, 1.55, r)*(1. - smoothstep(1.93, 1.95, r))*(.82 + .18*sin(r*95.));
  d += smoothstep(2.02, 2.04, r)*(1. - smoothstep(2.25, 2.27, r))*(.62 + .12*sin(r*140.));
  d *= 1. - .8*exp(-pow((r - 2.215)/.006, 2.));
  return d;
}
vec3 planetAlbedo(vec3 sp, float lat, float lon, int v){
  vec3 c = vec3(.5);
  if (v == 0) {
    float maria = smoothstep(.47, .6, fbm3(sp*1.7 + 3.1));
    c = mix(vec3(.6, .58, .55), vec3(.28, .28, .3), maria);
    float cr = craters(sp*4.5) + craters(sp*9.5 + 2.)*.6 + craters(sp*19.)*.35;
    c *= .9 + .35*cr;
    c *= .9 + .18*fbm3(sp*12.);
  } else if (v == 1) {
    float n = fbm3(sp*2.2 + 11.);
    c = mix(vec3(.74, .36, .19), vec3(.42, .2, .13), smoothstep(.44, .62, n));
    c = mix(c, vec3(.86, .52, .32), smoothstep(.55, .78, fbm3(sp*4.3 + 2.))*.4);
    float dl = mod(lon + 1.2 + PI, TAU) - PI;
    float vm = exp(-pow((lat + .05 - .05*sin(lon*3.))/.03, 2.))*smoothstep(.9, .2, abs(dl));
    c *= 1. - vm*.4;
    float cap = smoothstep(.83, .88, abs(sp.y) + .04*(fbm3(sp*9.) - .5));
    c = mix(c, vec3(.95, .93, .9), cap);
  } else if (v == 2) {
    vec3 q = vec3(sp.x*1.4, sp.y*4.5, sp.z*1.4);
    float n = fbm3(q + vec3(uTime*.015, 0., 0.) + fbm3(sp*2.)*1.5);
    c = mix(vec3(.96, .88, .66), vec3(.8, .66, .43), n);
  } else if (v == 3) {
    c = mix(vec3(.86, .83, .76), vec3(.72, .63, .52), smoothstep(.35, .75, fbm3(sp*2.5)));
    float l1 = pow(1. - abs(vnoise3(sp*5.)*2. - 1.), 22.);
    float l2 = pow(1. - abs(vnoise3(sp*11. + 5.)*2. - 1.), 30.);
    float l3 = pow(1. - abs(vnoise3(sp*23. + 9.)*2. - 1.), 40.);
    c = mix(c, vec3(.55, .32, .2), clamp(l1*.85 + l2*.7 + l3*.45, 0., 1.));
  } else if (v == 4) {
    c = mix(vec3(.88, .56, .26), vec3(.72, .42, .18), smoothstep(.35, .75, fbm3(sp*2.2)));
    c = mix(c, vec3(.5, .32, .18), smoothstep(.6, .75, fbm3(sp*3.5 + 4.))*.3);
  } else if (v == 5) {
    c = vec3(.34, .33, .32)*(.85 + .3*fbm3(sp*6.));
    c *= .92 + .3*(craters(sp*5.) + craters(sp*11.)*.6);
    float spot = exp(-length(sp - normalize(vec3(.25, .3, .92)))*45.);
    c = mix(c, vec3(.95), clamp(spot*1.6, 0., 1.));
  } else if (v == 6) {
    float w = fbm3(sp*vec3(2.2, .8, 2.2) + vec3(uTime*.02, 0., 0.));
    float b = lat*7.5 + (w - .5)*1.4;
    float band = .5 + .5*sin(b*2.2);
    float band2 = .5 + .5*sin(b*5.1 + 1.3);
    c = mix(vec3(.93, .87, .76), vec3(.72, .5, .36), smoothstep(.3, .7, band));
    c = mix(c, vec3(.58, .43, .34), band2*.3);
    c = mix(c, vec3(.82, .7, .58), smoothstep(.55, .9, fbm3(sp*6. + vec3(uTime*.04, 0., 0.)))*.3);
    c *= mix(1., .72, smoothstep(.7, 1.3, abs(lat)));
    float dl = mod(lon - 2.6 + PI, TAU) - PI;
    vec2 e = vec2(dl*1.35, (lat + .38)*2.9);
    float dd = length(e);
    float sw = fbm(rot2(e, dd*5. - uTime*.2)*7.);
    c = mix(c, mix(vec3(.78, .38, .24), vec3(.95, .62, .42), sw), smoothstep(.24, .15, dd));
    c = mix(c, vec3(.96, .9, .82), exp(-pow((dd - .26)/.03, 2.))*.5);
  } else if (v == 7) {
    float w = fbm3(sp*vec3(2., .7, 2.));
    float b = lat*11. + (w - .5)*.8;
    c = mix(vec3(.92, .83, .6), vec3(.78, .66, .46), .5 + .5*sin(b));
    c = mix(c, vec3(.7, .6, .45), smoothstep(.8, 1.3, abs(lat))*.6);
  } else {
    float w = fbm3(sp*vec3(2., .8, 2.) + vec3(uTime*.03, 0., 0.));
    c = mix(vec3(.16, .32, .82), vec3(.27, .48, .95), .5 + .5*sin(lat*9. + (w - .5)*2.5));
    float dl = mod(lon - 1.9 + PI, TAU) - PI;
    float ds = length(vec2(dl*1.4, (lat + .35)*3.));
    c = mix(c, vec3(.08, .15, .45), smoothstep(.22, .12, ds));
    float cl = smoothstep(.62, .8, fbm3(vec3(sp.x*3., sp.y*14., sp.z*3.) + 3.));
    c = mix(c, vec3(.92, .95, 1.), cl*.8*smoothstep(.2, .5, abs(lat + .1)));
  }
  return c;
}
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, .75);
  int v = int(uA.w + .5);
  float R = uA.x;
  vec2 q = rot2((p + par*.35)/R, -uA.y);
  vec3 L = normalize(vec3(-.62, .34, .7));
  L.xy = rot2(L.xy, -uA.y);
  float r2 = dot(q, q);
  bool rings = uB.w > .5;
  vec3 nr = normalize(vec3(0., cos(uB.x), sin(uB.x)));
  float zr = -(q.y*nr.y)/max(nr.z, .05);
  vec3 P = vec3(q, zr);
  float rr = length(P);
  float ringD = rings ? ringDens(rr) : 0.;
  float bsh = dot(P, L), csh = dot(P, P) - 1., dsh = bsh*bsh - csh;
  float ringLit = (dsh > 0. && -bsh - sqrt(max(dsh, 0.)) > 0.) ? .12 : 1.;
  bool ringFront = false;
  if (r2 < 1.) {
    vec3 n = vec3(q, sqrt(1. - r2));
    float lat = asin(clamp(n.y, -1., 1.));
    float lon = atan(n.x, n.z) + uTime*uA.z;
    vec3 sp = vec3(cos(lat)*sin(lon), sin(lat), cos(lat)*cos(lon));
    vec3 alb = planetAlbedo(sp, lat, lon, v);
    float ndl = dot(n, L);
    float lit = smoothstep(-.06, .35, ndl)*(.28 + .72*max(ndl, 0.));
    if (v >= 6) lit *= .72 + .28*n.z;
    if (rings) {
      float s = -dot(n, nr)/dot(L, nr);
      if (s > 0.) lit *= 1. - ringDens(length(n + s*L))*.75;
    }
    col = alb*lit*1.3;
    col += uC1*pow(1. - n.z, 2.2)*smoothstep(-.25, .4, ndl)*.9;
    if (v == 4) col += vec3(.35, .55, 1.)*pow(1. - n.z, 5.)*smoothstep(-.4, .3, ndl)*.8;
    float lon0 = atan(n.x, n.z);
    gHatch = lon0*15.; gHS = 1.;
    gHatch2 = (lat*.85 + lon0*.55)*14.; gHS2 = 1.;
    gInk = smoothstep(.955, .995, sqrt(r2))*.9;
    if (rings && ringD > 0. && zr > n.z) ringFront = true;
  } else {
    float r1 = sqrt(r2);
    float side = smoothstep(-.4, .7, dot(q/r1, L.xy));
    col += uC1*exp(-(r1 - 1.)*16.)*.55*side;
    if (v == 4) col += vec3(.35, .55, 1.)*exp(-(r1 - 1.)*30.)*.5*side;
  }
  if (rings && ringD > 0. && (r2 >= 1. || ringFront)) {
    vec3 ringC = vec3(.86, .76, .58)*(.75 + .25*vnoise(vec2(rr*60., 1.)));
    col = mix(col, ringC*ringLit*1.15, clamp(ringD, 0., 1.)*.92);
    gHatch = rr*22.; gHS = 1.;
  }
  return vec4(col, 1.);
}
#endif

// ============================ ÉTOILES ============================
#if ART == 2
float voronoiF1(vec2 x){
  vec2 n = floor(x), f = fract(x);
  float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(n + g);
    o = .5 + .45*sin(uTime*.15 + TAU*o);
    vec2 r = g + o - f;
    md = min(md, dot(r, r));
  }
  return sqrt(md);
}
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, 1.);
  int v = int(uA.z + .5);
  vec2 q = p + par*.3;
  float r = length(q);
  if (v == 0) {
    float R = uA.x;
    float core = smoothstep(R*1.05, R*.55, r);
    float halo = exp(-r*r/(R*R*9.))*.9 + R*R*1.2/(r*r + R*R*.6)*.12;
    float sp = spikeF(q, .35*uA.y, .0025);
    col += uC1*core*7. + uC2*halo*1.8 + mix(uC2, vec3(1.), .5)*sp*uA.y*1.6;
    col += spectrum(r*6. - .2)*exp(-pow((r - R*2.4)/(R*.5), 2.))*.08;
    int comp = int(uA.w + .5);
    if (comp == 1) { vec2 o = q - vec2(.2, .13); float rc = length(o); col += vec3(.85, .9, 1.)*(smoothstep(.014, .006, rc)*3. + exp(-rc*rc/.0012)*.5); }
    if (comp == 2) { vec2 e = rot2(q, .3)*vec2(1., 1.8); float re = length(e); col += vec3(.9, .75, .55)*exp(-pow((re - .42)/.07, 2.))*(.14 + .1*fbm(e*9.)); }
    if (comp == 3) { vec2 o = q - vec2(-.24, .1); col += vec3(1., .95, .85)*(smoothstep(.012, .005, length(o))*2. + exp(-dot(o, o)/.001)*.35); }
    if (comp == 4) { vec2 o = q - vec2(.16, -.2); col += vec3(.75, .85, 1.)*(smoothstep(.01, .004, length(o))*1.5 + exp(-dot(o, o)/.0008)*.3); }
    gHatch = r*36.; gHS = 1.;
  } else if (v == 1) {
    float R = uA.x;
    float rn = r/R;
    float env = fbm(q*3.5 + uTime*.01)*exp(-max(rn - .95, 0.)*2.2)*smoothstep(1.9, 1., rn);
    col += vec3(.6, .18, .08)*env*.55;
    if (rn < 1.02) {
      vec2 qq = q/R;
      float z = sqrt(max(1. - dot(qq, qq), 0.));
      vec3 n = vec3(qq, z);
      vec2 uvs = vec2(atan(n.x, max(n.z, .001)) + uTime*.02, asin(clamp(n.y, -1., 1.)))*2.6;
      float cell = voronoiF1(uvs + fbm(uvs*1.3)*.6);
      float gran = smoothstep(0., .6, cell);
      float limb = .38 + .62*pow(z, .55);
      vec3 sc = mix(vec3(1., .72, .38), vec3(.75, .22, .08), gran)*limb;
      sc += vec3(1., .85, .5)*exp(-length(qq - vec2(-.25, .3))*3.)*.45;
      col = mix(col, sc*2.2, smoothstep(1.02, .96, rn));
      gHatch = asin(clamp(n.y, -1., 1.))*10.; gHS = 1.;
    }
    col += vec3(1., .35, .15)*exp(-pow(max(rn - 1., 0.)*5., 2.))*.5;
  } else {
    float R = uA.x;
    float rn = r/R;
    col += uC2*exp(-max(rn - 1., 0.)*3.)*.35*step(1., rn);
    if (rn < 1.) {
      vec2 qq = q/R; float z = sqrt(1. - dot(qq, qq));
      float g = fbm(qq*8. + uTime*.05);
      col = mix(vec3(1., .5, .22), vec3(.8, .18, .06), g)*(.45 + .55*z)*2.;
      gHatch = asin(clamp(qq.y, -1., 1.))*10.; gHS = 1.;
    }
    vec2 fq = rot2(q - vec2(R*.7, R*.7), -.785);
    float ar = abs(length(fq*vec2(1., 1.3)) - R*.3);
    col += vec3(1., .6, .3)*exp(-ar/.008)*step(0., fq.y + .02)*(.6 + .4*sin(uTime*3. + fq.x*40.))*1.6;
  }
  return vec4(col, 1.);
}
#endif

// ============================ AMAS ============================
#if ART == 3
const vec3 PLE[9] = vec3[9](
  vec3(-0.148, -0.095, 2.87), vec3(-0.531, -0.147, 3.62), vec3(0.447, -0.087, 3.70), vec3(0.230, 0.168, 3.87), vec3(0.116, -0.252, 4.18),
  vec3(0.371, 0.267, 4.29), vec3(-0.537, -0.063, 5.05), vec3(0.463, 0.090, 5.45), vec3(0.211, 0.355, 5.76));
vec4 artMain(vec2 p, vec2 par){
  int v = int(uA.z + .5);
  vec3 col = spaceBg(p + par)*.8 + starfield(p + par, .55);
  vec2 q = p + par*.3;
  float r = length(q);
  if (v == 2) {
    col += vec3(1., .88, .7)*(exp(-r*r/.012)*1.4 + exp(-r*r/.07)*.35 + exp(-r*r/.35)*.06);
    float prof = 1./(1. + r*r/.02);
    for (int k = 0; k < 3; k++){
      float cells = 40. + float(k)*45.;
      vec2 g = q*cells; vec2 id = floor(g); vec2 f = fract(g);
      float h = hash12(id + float(k)*13.1);
      float prob = clamp(prof*1.25, 0., .96)*smoothstep(.95, .35, r);
      if (h < prob) {
        vec2 sp = .2 + .6*hash22(id + float(k)*7.3);
        float m = hash12(id*1.7 + float(k));
        float d = length(f - sp)/cells;
        float sz = max(.0022 + .003*m, gPx*.85);
        vec3 tc = m > .93 ? vec3(1., .62, .35) : (m < .06 ? vec3(.65, .8, 1.) : vec3(1., .93, .8));
        col += tc*exp(-d*d/(sz*sz))*(.5 + 1.3*m);
      }
    }
    gHatch = r*50.; gHS = 1.;
  } else if (v == 1) {
    vec2 qc = q/1.2 + vec2(.03, -.04);
    vec2 w = rot2(qc, .45);
    float neb = fbm(w*vec2(2.4, 5.5) + fbm(qc*3.)*1.3 + 2.)*.7 + fbm(qc*5.)*.3;
    float dens = 0.;
    for (int i = 0; i < 9; i++){ vec2 d = qc - PLE[i].xy; dens += exp(-dot(d, d)/.03)*(6. - PLE[i].z)*.3; }
    col += vec3(.3, .5, 1.)*smoothstep(.3, .8, neb)*dens*.55 + vec3(.25, .42, .9)*dens*.06;
    for (int i = 0; i < 9; i++){
      float b = clamp((6.2 - PLE[i].z)/3.3, 0., 1.);
      col += brightStar(qc, PLE[i].xy, b, vec3(.78, .87, 1.), 1.);
    }
    col += starCell(qc, 16., .35, 5.5, 1.)*.8;
  } else {
    for (int k = 0; k < 2; k++){
      float cells = 7. + float(k)*6.;
      vec2 g = q*cells; vec2 id = floor(g);
      float h = hash12(id + 31.7 + float(k));
      float prob = .78*exp(-r*r/(uA.x*uA.x*.7));
      if (h < prob) {
        vec2 sp = .2 + .6*hash22(id + 5.1 + float(k));
        float m = hash12(id*2.1 + 3. + float(k));
        vec3 tint = m > .8 ? vec3(1., .72, .45) : vec3(1., .95, .85);
        col += brightStar(q, (id + sp)/cells, .25 + .6*m*m, tint, m > .7 ? .6 : 0.);
      }
    }
  }
  return vec4(col, 1.);
}
#endif

// ============================ COMÈTES ============================
#if ART == 4
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, .9);
  vec2 q = p + par*.35;
  vec2 head = vec2(-.44, -.38);
  vec2 dir = normalize(vec2(.78, .64));
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 d = q - head;
  float s = dot(d, dir), w = dot(d, nrm);
  float sp = max(s, 0.);
  float wc = w + uA.y*sp*sp - .02*sp;
  float wid = .02 + sp*.3;
  float dust = exp(-wc*wc/(wid*wid))*smoothstep(-.04, .08, s)*exp(-sp*1.05/uA.z);
  float stri = .55 + .45*fbm(vec2(sp*3.5, wc/wid*1.6 + 3.));
  col += vec3(1., .9, .74)*dust*stri*1.5;
  float wi = w + sp*.13;
  float widi = .006 + sp*.05;
  float ion = exp(-wi*wi/(widi*widi))*smoothstep(0., .08, s)*exp(-sp*.55);
  float streak = .45 + .55*fbm(vec2(sp*5. - uTime*.5, wi*70.));
  col += vec3(.32, .58, 1.)*ion*streak*uA.w*1.7;
  float r = length(d);
  col += vec3(.75, .95, 1.)*(exp(-r*r/.0025)*1.5 + exp(-r*r/.025)*.35) + vec3(1.)*exp(-r*r/.00012)*3.;
  gPop = clamp((dust*stri + ion*uA.w)*1.1, 0., 1.);
  gHatch = w*20.; gHS = 1.;
  return vec4(col, 1.);
}
#endif

// ============================ NÉBULEUSES PLANÉTAIRES ============================
#if ART == 5
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, .85);
  int v = int(uA.x + .5);
  vec2 q = rot2(p + par*.3, uA.y);
  if (v == 0) {
    vec2 e = q*vec2(1., 1.3);
    float r = length(e);
    float a = atan(e.y, e.x);
    float n = fbm(e*6. + 2.);
    float ring = exp(-pow((r - .42)/.12, 2.))*(.7 + .6*n);
    float inner = smoothstep(.46, .12, r)*(.55 + .35*fbm(e*4. + 7.));
    float outer = exp(-pow((r - .57)/.065, 2.))*(.55 + .7*fbm(e*9. + 3.));
    float halo = exp(-pow((r - .8)/.13, 2.))*fbm(vec2(a*4., r*7.))*.35;
    col += vec3(.2, .75, .72)*inner*1.2 + vec3(1., .78, .32)*ring*1.4 + vec3(1., .28, .22)*outer*1.5 + vec3(.9, .22, .2)*halo;
    col += vec3(.85, .92, 1.)*exp(-dot(q, q)/.00025)*3.;
    gHatch = r*44.; gHS = 1.;
  } else {
    float r = length(q);
    float rings = 0.;
    for (int k = 0; k < 6; k++){
      float rk = .46 + float(k)*.075;
      rings += exp(-pow((r - rk)/.012, 2.))*(.35 + .65*fbm(q*6. + float(k)))*(1. - float(k)*.13);
    }
    col += vec3(1., .45, .3)*rings*.35 + vec3(.8, .3, .25)*exp(-r*r/.35)*.08;
    vec2 e1 = rot2(q, .55)*vec2(1.9, 1.);
    vec2 e2 = rot2(q, -.35)*vec2(1.5, 1.05);
    float s1 = exp(-pow((length(e1) - .26)/.035, 2.));
    float s2 = exp(-pow((length(e2) - .24)/.03, 2.));
    float fill = smoothstep(.3, .05, length(e1))*.5 + smoothstep(.27, .05, length(e2))*.4;
    float nn = fbm(q*10. + 1.);
    col += vec3(.25, .9, .75)*(s1 + s2)*(.8 + .5*nn)*1.2 + vec3(.3, .8, .7)*fill*(.6 + .4*nn)*.8;
    vec2 ax = rot2(vec2(0., 1.), .55);
    for (int k = 0; k < 2; k++){ vec2 c = ax*.36*(float(k)*2. - 1.); col += vec3(1., .35, .25)*exp(-dot(q - c, q - c)/.0025)*1.2; }
    col += vec3(.9, .95, 1.)*exp(-dot(q, q)/.0003)*3.;
    gHatch = r*44.; gHS = 1.;
  }
  return vec4(col, 1.);
}
#endif

// ============================ RÉMANENTS / PULSAR ============================
#if ART == 6 || ART == 9
vec3 crab(vec2 q, float k){
  vec2 e = rot2(q, .5)*vec2(1., 1.42);
  float r = length(e);
  float a = atan(e.y, e.x);
  float edge = .6 + .1*(fbm(vec2(a*1.6, 2.)) - .5)*2.;
  float body = smoothstep(edge, edge - .14, r);
  vec3 c = vec3(.5, .66, 1.)*body*(.3 + .7*exp(-r*r/.12))*(.65 + .35*fbm(e*3.))*.9;
  vec2 w = e*4.5 + vec2(fbm(e*2.5), fbm(e*2.5 + 7.))*2.2;
  float fil = pow(1. - abs(2.*vnoise(w) - 1.), 7.) + .6*pow(1. - abs(2.*vnoise(w*2.1 + 3.) - 1.), 9.);
  fil *= body*smoothstep(.08, .5, r);
  vec3 fc = mix(vec3(1., .3, .16), vec3(1., .74, .38), fbm(e*4. + 5.));
  c += fc*fil*1.5;
  return c*k;
}
#endif
#if ART == 6
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, 1.);
  int v = int(uA.x + .5);
  vec2 q = p + par*.3;
  if (v == 0) {
    col += crab(q, 1.);
    col += vec3(.8, .9, 1.)*exp(-dot(q, q)/.0002)*2.5;
    gHatch = length(q)*44.; gHS = 1.;
  } else {
    col += starfield(p*1.7 + par, 1.)*.6;
    vec2 c = vec2(1.3, -.5); float R = 1.25;
    float sd = length(q - c) - R;
    float n1 = fbm(q*2.6 + 1.) - .5;
    float acc = 0.;
    for (int i = 0; i < 5; i++){
      float fi = float(i);
      float o = (fi - 2.)*.03 + n1*(.12 + fi*.02);
      float dd = abs(sd - o + .015*sin(q.y*18. + fi*2.1));
      acc += exp(-dd/.005)*(.35 + .65*fbm(q*7. + fi*3.1));
    }
    vec3 fcol = mix(vec3(.2, .78, .92), vec3(1., .3, .24), smoothstep(-.05, .05, sd - n1*.1));
    vec2 c2 = vec2(-1.55, .55); float R2 = 1.3;
    float sd2 = length(q - c2) - R2;
    float n2 = fbm(q*3.1 + 9.) - .5;
    float acc2 = 0.;
    for (int i = 0; i < 4; i++){
      float fi = float(i);
      float o = (fi - 1.5)*.028 + n2*.14;
      float dd = abs(sd2 - o + .012*sin(q.x*21. + fi));
      acc2 += exp(-dd/.0045)*(.3 + .7*fbm(q*8. + fi*1.7 + 4.));
    }
    vec3 fcol2 = mix(vec3(.25, .8, .95), vec3(1., .32, .26), smoothstep(-.05, .05, -sd2 + n2*.1));
    col += fcol*acc*.75 + fcol2*acc2*.6;
    gHatch = sd*40.; gHS = 1.;
  }
  return vec4(col, 1.);
}
#endif

// ============================ GALAXIES ============================
#if ART == 7
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, .8);
  int v = int(uB.z + .5);
  vec2 q = rot2(p + par*.3, uA.y);
  if (v == 1) {
    vec2 e = q;
    float bul = exp(-(e.x*e.x/.07 + e.y*e.y/.035));
    float halo = exp(-(e.x*e.x/.5 + e.y*e.y/.25));
    vec2 dk = vec2(e.x, e.y/.13);
    float rd = length(dk);
    float disk = exp(-pow(rd/.72, 4.))*exp(-abs(e.y)/.05)*.8;
    vec3 c = vec3(1., .86, .64)*(bul*1.35 + halo*.22) + vec3(.95, .85, .7)*disk*.9;
    float laneY = -.012 + .02*e.x*e.x;
    float lane = exp(-pow((e.y - laneY)/.022, 2.))*smoothstep(.78, .35, abs(e.x));
    lane *= .75 + .25*fbm(e*vec2(8., 30.));
    c *= 1. - lane*.92;
    c += vec3(1., .8, .6)*exp(-pow((e.y - laneY - .035)/.012, 2.))*smoothstep(.7, .3, abs(e.x))*.35;
    col += starCell(q, 30., .5*halo + .02, 8.8, .6)*1.2;
    col += c;
    gHatch = e.y*50.; gHS = 1.;
  } else {
    float incl = uA.x;
    vec2 g = vec2(q.x, q.y/incl);
    float r = length(g);
    float th = atan(g.y, g.x);
    float pert = (fbm(g*3.5 + 2.) - .5)*2.2;
    float ph = uA.z*(th - log(r + .004)/tan(uA.w)) + pert + uTime*uB.w*3.;
    float arm = pow(.5 + .5*cos(ph), 2.4);
    float disk = exp(-r/.23)*smoothstep(1.05, .55, r);
    float clump = smoothstep(.58, .82, fbm(g*13. + 3.))*arm;
    float dustL = pow(.5 + .5*cos(ph + 1.1), 7.)*uB.y*smoothstep(.04, .2, r);
    vec3 c = vec3(.62, .74, 1.)*(arm*.9 + .25)*disk*1.7 + vec3(1., .45, .62)*clump*disk*2.3 + vec3(.6, .75, 1.)*clump*disk*.8;
    c *= 1. - dustL*.8*(.55 + .45*fbm(g*9.));
    float bR = uB.x;
    c += vec3(1., .82, .56)*(exp(-r*r/(bR*bR))*2.4 + exp(-r*r/(bR*bR*6.))*.4);
    col += c;
    if (v == 0) {
      vec2 cp = q - vec2(.47, .52);
      float rc = length(cp*vec2(1., 1.2));
      col += vec3(1., .82, .58)*(exp(-rc*rc/.006)*1.6 + exp(-rc*rc/.03)*.35);
      col *= 1. - exp(-pow((cp.y + .2*cp.x)/.02, 2.))*smoothstep(.12, 0., rc)*.5;
    }
    if (v == 2) {
      vec2 m32 = q - vec2(.1, .19);
      col += vec3(1., .86, .66)*(exp(-dot(m32, m32)/.0015)*1.3 + exp(-dot(m32, m32)/.01)*.25);
      vec2 m110 = rot2(q - vec2(-.3, -.46), .6)*vec2(1., 1.8);
      col += vec3(1., .86, .7)*exp(-dot(m110, m110)/.012)*.55;
    }
    gHatch = r*45.; gHS = 1.;
  }
  return vec4(col, 1.);
}
#endif

// ============================ NÉBULEUSES EN ÉMISSION ============================
#if ART == 8
float pillarSD(vec2 p, vec2 a, vec2 b, float ra, float rb){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.); return length(pa - ba*h) - mix(ra, rb, h); }
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, .7);
  int v = int(uA.x + .5);
  if (v == 0) {
    vec2 q = p + par*.35;
    vec2 w = q + .38*(vec2(fbm(q*2.1 + 1.7 + uTime*.008), fbm(q*2.1 + 9.2 - uTime*.008)) - .5);
    float d = fbm(w*2.6 + 3.);
    vec2 cc = q - vec2(.03, .06);
    float core = exp(-dot(cc, cc)/.045);
    vec2 eq = q*vec2(.85, 1.2);
    float env = exp(-dot(eq, eq)/.33);
    float dens = smoothstep(.28, .85, d)*env*1.3 + core*.9;
    vec2 bq = (q - vec2(.16, .24))*vec2(1.6, 1.);
    float bay = exp(-dot(bq, bq)/.018)*smoothstep(.35, .7, fbm(q*6.));
    dens *= 1. - bay*.85;
    vec3 c = vec3(1., .2, .3)*dens*1.15 + mix(vec3(1., .55, .5), vec3(.3, .95, .85), core)*core*1.25 + vec3(1., .96, .9)*pow(core, 4.)*1.6;
    float dust = smoothstep(.55, .8, fbm(q*3.4 + 20.))*smoothstep(.15, .6, length(q));
    c *= 1. - dust*.7;
    col = col*(1. - clamp(dens, 0., 1.)*.6) + c;
    vec2 m43 = q - vec2(.08, .5);
    col += vec3(1., .35, .4)*exp(-dot(m43, m43)/.01)*.5;
    col += brightStar(q, vec2(.02, .07), .6, vec3(.85, .92, 1.), .4);
    col += brightStar(q, vec2(.05, .05), .45, vec3(.85, .92, 1.), 0.);
    col += brightStar(q, vec2(.035, .095), .35, vec3(.85, .92, 1.), 0.);
    col += brightStar(q, vec2(.065, .08), .3, vec3(.85, .92, 1.), 0.);
    gHatch = d*30.; gHS = 1.;
  } else {
    vec2 q = p + par*.25;
    float bgn = fbm(q*1.7 + 3.);
    vec3 bgc = mix(vec3(.18, .42, .5), vec3(.95, .68, .38), smoothstep(-.2, .9, q.y*.55 + .5 + (bgn - .5)*.7));
    col += bgc*(.25 + .75*bgn*bgn)*.5;
    col += vec3(.45, .8, .78)*smoothstep(.55, .9, fbm(q*3. + 11.))*.12;
    vec2 qp = p + par*.12;
    float sd = pillarSD(qp, vec2(-.4, -1.2), vec2(-.3, .38), .17, .085);
    sd = min(sd, pillarSD(qp, vec2(.04, -1.2), vec2(.07, .02), .13, .07));
    sd = min(sd, pillarSD(qp, vec2(.44, -1.2), vec2(.43, -.22), .11, .06));
    sd += (fbm(qp*8.) - .5)*.08 + (fbm(qp*20. + 3.) - .5)*.03;
    float inside = smoothstep(.012, -.012, sd);
    vec3 dark = vec3(.06, .04, .03) + vec3(.25, .13, .07)*fbm(qp*5.)*.6;
    float lightDir = smoothstep(-.6, .6, qp.y + .3);
    col = mix(col, dark*(.6 + .8*lightDir), inside*.95);
    col += vec3(1., .72, .42)*exp(-abs(sd)/.01)*(.4 + .6*lightDir)*1.3*(.7 + .3*fbm(qp*14.));
    col += vec3(1., .8, .55)*smoothstep(.1, -.05, sd)*(1. - inside)*fbm(qp*vec2(10., 4.) + vec2(0., -uTime*.05))*.25;
    col += starCell(p + par*.05, 14., .25, 4.4, 1.)*.9;
    gHatch = sd*60.; gHS = 1.;
  }
  return vec4(col, 1.);
}
#endif

// ============================ PULSAR ============================
#if ART == 9
vec4 artMain(vec2 p, vec2 par){
  vec3 col = spaceBg(p + par) + starfield(p + par, .9);
  vec2 q = p + par*.3;
  col += crab(q*.8, .32);
  float t = uTime*1.1;
  vec3 spin = normalize(vec3(.2, 1., .15));
  vec3 m0 = normalize(cross(spin, vec3(0., 0., 1.)));
  vec3 m1 = cross(spin, m0);
  float inc = .6;
  vec3 m = normalize(spin*cos(inc) + (m0*cos(t) + m1*sin(t))*sin(inc));
  vec2 a2 = normalize(m.xy + 1e-4);
  float r = length(q);
  vec2 qn = q/max(r, 1e-4);
  float ang = acos(clamp(abs(dot(qn, a2)), 0., 1.));
  float flash = exp(-(1. - abs(m.z))*6.);
  float beam = exp(-pow(ang/(.07 + r*.05), 2.))*exp(-r*1.1)*(.7 + 1.8*flash)*smoothstep(0., .04, r);
  col += vec3(.75, .88, 1.)*beam*1.6;
  float th = acos(clamp(dot(qn, a2), -1., 1.));
  float s2 = sin(th); s2 *= s2;
  float fl = 0.;
  for (int k = 0; k < 4; k++){ float L = .16 + float(k)*.13; fl += exp(-abs(r - L*s2)/.004)*smoothstep(0., .1, s2)*(1. - float(k)*.18); }
  col += vec3(.55, .5, 1.)*fl*.5*(.6 + .4*flash);
  vec2 e = rot2(q, atan(spin.x, spin.y))*vec2(1., 3.);
  col += vec3(.6, .75, 1.)*exp(-pow((length(e) - .26)/.035, 2.))*.55;
  col += vec3(.85, .92, 1.)*(exp(-r*r/.00015)*6. + exp(-r*r/.004)*1.2*(1. + flash));
  col += vec3(.6, .8, 1.)*flash*.12*exp(-r*r/.2);
  gHatch = r*50.; gHS = 1.;
  return vec4(col, 1.);
}
#endif

// ============================ TROUS NOIRS ============================
#if ART == 10
vec3 diskTex(float Rd, float phi, float rin, float rout){
  float x = (Rd - rin)/(rout - rin);
  float om = uTime*uA.w*1.8*pow(rin/max(Rd, rin), 1.5);
  float n = fbm(vec2(Rd*16., (phi + om)*3.))*.7 + fbm(vec2(Rd*40., (phi + om*1.1)*6.))*.3;
  float I = pow(max(1. - x, 0.), 1.4)*(.45 + .9*n)*smoothstep(0., .06, x);
  vec3 c = mix(vec3(1., .96, .88), vec3(1., .6, .22), smoothstep(0., .35, x));
  c = mix(c, vec3(.9, .28, .08), smoothstep(.35, 1., x));
  return c*I;
}
vec4 artMain(vec2 p, vec2 par){
  int v = int(uA.x + .5);
  float rs = uA.y;
  vec2 q = p + par*.25;
  float r = length(q);
  vec2 bgp = p + par;
  float thE = rs*1.45;
  vec2 src = bgp*(1. - thE*thE/max(dot(q, q), 1e-4));
  vec3 col = spaceBg(src) + starfield(src, 1.);
  if (v == 1) col += vec3(1., .82, .6)*(exp(-r*r/.5)*.18 + exp(-r*r/.08)*.12);
  float shadow = smoothstep(rs, rs*.93, r);
  col *= 1. - shadow;
  float pop = 0.;
  if (v == 0) {
    float el = uA.z;
    float rin = rs*1.35, rout = rs*4.4;
    col += vec3(1., .9, .75)*exp(-pow((r - rs*1.03)/(rs*.018), 2.))*2.;
    float psi = atan(q.y, q.x);
    float up = q.y > 0. ? 1. : 0.;
    float h = rs*mix(.16, .62, up)*(.35 + .65*abs(sin(psi)));
    float rho = (r - rs*1.05)/max(h, 1e-3);
    if (rho > 0. && rho < 1.) {
      float Rd = mix(rin, rout*.8, rho);
      vec3 hc = diskTex(Rd, psi + PI*.5, rin, rout);
      col += hc*pow(1. + .55*cos(psi), 2.2)*mix(.55, 1.15, up)*smoothstep(1., .7, rho);
    }
    float Z = q.y/sin(el);
    float X = q.x;
    float Rd = length(vec2(X, Z));
    if (Rd > rin && Rd < rout) {
      float phi = atan(Z, X);
      vec3 dc = diskTex(Rd, phi, rin, rout);
      dc *= pow(max(1. + .6*(-X/Rd), .2), 2.4);
      dc = mix(dc, dc*vec3(.75, .85, 1.25), clamp(-X/Rd, 0., 1.)*.4);
      float front = step(q.y, 0.);
      col += dc*1.6*(front + (1. - front)*(1. - shadow));
      pop = clamp(luma(dc)*1.8, 0., 1.);
    }
  } else {
    float R0 = .33;
    float a = atan(q.y, q.x);
    float ring = exp(-pow((r - R0)/.075, 2.));
    float bright = .55 + .9*smoothstep(-.2, 1., -sin(a + .35));
    float n = fbm(vec2(a*2.5 + uTime*.12, r*6.));
    float I = ring*bright*(.7 + .6*n);
    col += mix(vec3(1., .42, .12), vec3(1., .86, .6), smoothstep(.4, 1.2, I))*I*1.8;
    col += vec3(1., .5, .15)*exp(-pow((r - R0)/.2, 2.))*.15;
    vec2 jd = normalize(vec2(.52, .85));
    float s = dot(q, jd), w = dot(q, vec2(-jd.y, jd.x));
    float jw = .012 + max(s, 0.)*.05;
    float jet = exp(-w*w/(jw*jw))*smoothstep(.12, .3, s)*exp(-max(s, 0.)*.55);
    float knots = .55 + .45*pow(.5 + .5*sin(s*16. - uTime*2.2), 3.);
    vec3 jc = vec3(.55, .72, 1.)*jet*knots*1.9;
    col += jc + vec3(.55, .72, 1.)*exp(-w*w/(jw*jw))*smoothstep(-.12, -.3, s)*exp(-abs(s)*2.5)*.25;
    pop = clamp(luma(jc)*1.6, 0., 1.);
  }
  gPop = pop;
  gHatch = r*50.; gHS = 1.;
  return vec4(col, 1.);
}
#endif
