uniform sampler2D uLayout;
uniform sampler2D uMask;
uniform vec2 uTexel;
uniform vec2 uArtC;
uniform float uArtR;
uniform float uAspect;
uniform float uGlow;
uniform vec3 uGlowCol;
uniform float uFlash;
uniform float uDim;
uniform float uHolo;
uniform float uSweep;
varying vec2 vUv; varying vec3 vPosV; varying vec3 vNrmV; varying vec3 vTanV; varying vec3 vBitV;

float holoStars(vec2 uv){
  vec2 g = uv*vec2(uAspect, 1.)*15.;
  vec2 id = floor(g); vec2 f = fract(g) - .5;
  float h = hash12(id + 2.);
  vec2 d = f - (hash22(id) - .5)*.5;
  float s = exp(-abs(d.x)*55.)*exp(-abs(d.y)*7.) + exp(-abs(d.y)*55.)*exp(-abs(d.x)*7.);
  return s*step(.5, h);
}

void main(){
  vec4 lay = texture2D(uLayout, vUv);
  vec4 msk = texture2D(uMask, vUv);
  vec3 V = normalize(-vPosV);
  vec3 N = normalize(vNrmV), T = normalize(vTanV), B = normalize(vBitV);
  vec3 Vt = vec3(dot(V, T), dot(V, B), dot(V, N));
  vec2 tilt = Vt.xy/max(Vt.z, .25);
  float hL = texture2D(uMask, vUv - vec2(uTexel.x*1.5, 0.)).r;
  float hR = texture2D(uMask, vUv + vec2(uTexel.x*1.5, 0.)).r;
  float hD = texture2D(uMask, vUv - vec2(0., uTexel.y*1.5)).r;
  float hU = texture2D(uMask, vUv + vec2(0., uTexel.y*1.5)).r;
  vec3 nt = normalize(vec3((hL - hR)*1.4, (hD - hU)*1.4, 1.));
  vec3 Nf = normalize(nt.x*T + nt.y*B + nt.z*N);
  vec3 Rf = reflect(-V, Nf);
  vec3 Rc = reflect(-V, N);
  float fres = pow(1. - clamp(dot(N, V), 0., 1.), 5.);
  vec3 Lk = normalize(vec3(-.45, .6, .66));

  vec2 ap = (vUv - uArtC)*vec2(uAspect, 1.)/uArtR;
  gPx = max(fwidth(ap.x), fwidth(ap.y));
  vec3 artC = vec3(0.);
  vec2 par = -tilt*PARALLAX;
  float needArt = max(msk.b, 1. - lay.a);
#if TIER == 4
  needArt = 1.;
#endif
  if (needArt > .002) artC = artMain(ap, par).rgb;
  vec3 col = lay.rgb;

#if TIER == 0
  // Gravure : l'image devient des tailles d'encre sur papier
  float lum = luma(artC);
  float tone = 1. - exp(-lum*2.2);
  float dark = smoothstep(.05, .95, 1. - tone)*.88;
  float hc = gHS > .5 ? gHatch : ap.y*30.;
  float dd1 = abs(fract(hc) - .5)*2.;
  float aa1 = fwidth(hc)*2. + .001;
  float ink1 = 1. - smoothstep(dark - aa1, dark + aa1, dd1);
  float hc2 = gHS2 > .5 ? gHatch2 : dot(ap, vec2(.7071, -.7071))*32.;
  float dd2 = abs(fract(hc2) - .5)*2.;
  float aa2 = fwidth(hc2)*2. + .001;
  float dark2 = clamp((dark - .56)*2.3, 0., 1.);
  float ink2 = 1. - smoothstep(dark2 - aa2, dark2 + aa2, dd2);
  float ink = max(ink1, ink2);
  ink = mix(ink, dark*.95, smoothstep(.35, .85, max(aa1, aa2)));
  ink = max(ink, gInk);
  vec3 eng = mix(vec3(.80, .70, .49), vec3(.03, .028, .045), ink);
  col = mix(eng, lay.rgb, lay.a);
  col *= .92 + .11*fbm(vUv*vec2(uAspect, 1.)*150.);
  col *= 1. + dot(nt.xy, vec2(-.6, .6))*.5*msk.r;
  col *= .86 + .2*max(dot(N, Lk), 0.) + .08*fres;
#elif TIER == 1
  // Argentique : tirage monochrome, reflets de miroir d'argent sous l'angle
  float lum = luma(artC);
  float m = 1. - exp(-lum*1.9);
  vec3 silver = mix(vec3(.006, .007, .011), vec3(.74, .79, .86), m) + vec3(.9, .95, 1.)*max(lum - 1.2, 0.)*.25;
  silver += envMap(Rc)*vec3(.35, .4, .46)*smoothstep(.12, .55, length(tilt))*(1. - m)*.5;
  col = mix(silver, lay.rgb, lay.a);
#else
  vec3 artG = artC;
  #if TIER == 3
  artG *= vec3(1.05, 1., .93);
  #endif
  col = mix(artG, lay.rgb, lay.a);
#endif

  float foil = msk.r;
  float patt = msk.g;
  vec3 e = envMap(Rf);
#if TIER == 1
  col = mix(col, e*vec3(.9, .93, .97) + vec3(.03), foil);
  col += e*vec3(.5, .55, .6)*patt*.35;
#elif TIER == 2
  vec2 rv = (vUv - uArtC)*vec2(uAspect, 1.);
  vec2 rd = normalize(rv + 1e-4);
  float g1 = dot(tilt + vec2(.12, -.2), rd)*3.2 + length(rv)*2.;
  float g2 = dot(tilt, normalize(vec2(1., .6)))*2.6 + (vUv.x + vUv.y)*1.4;
  float tk = smoothstep(.02, .35, length(tilt));
  vec3 holoR = mix(vec3(.78), spectrum(g1), .72);
  vec3 holoL = mix(vec3(.72), spectrum(g2), .78);
  col = mix(col, mix(e*vec3(.85, .9, 1.), holoR*(.3 + e*.8), .7), foil);
  col += holoL*(.1 + .55*e.g)*patt*(.16 + .42*tk)*uHolo;
  col += holoL*holoStars(vUv)*.3*(.22 + tk)*uHolo*lay.a;
  col += spectrum(g2 + .3)*.03*uHolo*(1. - lay.a)*tk;
#elif TIER == 3
  vec3 gold = vec3(1., .74, .32);
  col = mix(col, e*mix(gold, vec3(1., .95, .85), fres*.6)*1.05 + gold*.05, foil);
  col += e*gold*patt*.4;
  vec2 gc = vUv*vec2(uAspect, 1.)*230.;
  vec2 gid = floor(gc); vec2 gf = fract(gc) - .5;
  float gh = hash12(gid);
  vec3 gn = normalize(vec3((hash22(gid + 3.) - .5)*1.3, 1.));
  vec3 gnV = normalize(gn.x*T + gn.y*B + gn.z*N);
  float sp = pow(max(dot(gnV, normalize(Lk + V)), 0.), 260.) + .6*pow(max(dot(gnV, normalize(vec3(.1, .2, 1.) + V)), 0.), 300.);
  sp *= step(.84, gh)*smoothstep(.4, 0., length(gf));
  col += vec3(1., .86, .55)*sp*3.2*lay.a*(1. - foil*.5);
#elif TIER == 4
  float th = fbm(vUv*vec2(uAspect, 1.)*3. + uTime*.04)*2.2 + dot(tilt, vec2(1.3, .9))*1.6 + length((vUv - uArtC)*vec2(uAspect, 1.))*1.5;
  vec3 film = spectrum(th);
  col = mix(col, e*(.45 + .55*film)*1.15 + film*.06, foil);
  col += film*(.2 + .8*e.g)*patt*.45;
  col += film*.012*(1. - lay.a);
  col = mix(col, artC + col*.15, clamp(gPop*(1. - msk.b)*1.1, 0., 1.));
#endif

#if TIER > 0
  float spec = pow(max(dot(Rc, Lk), 0.), 90.)*.32 + pow(max(dot(Rc, normalize(vec3(.05, .1, 1.))), 0.), 500.)*.14;
  col += vec3(1., .97, .94)*spec + envMap(Rc)*fres*.22;
#endif
  float sw = exp(-pow((vUv.x*uAspect + vUv.y*.6 - uSweep)*4., 2.));
  col += vec3(1.)*sw*.4*(.25 + foil);
  vec2 ed = min(vUv, 1. - vUv)*vec2(uAspect, 1.);
  float edge = min(ed.x, ed.y);
  col += uGlowCol*uGlow*(exp(-edge*26.)*1.8 + .12);
  col += vec3(1.)*uFlash;
  col *= 1. - uDim*.74;
  gl_FragColor = vec4(col, 1.);
}
