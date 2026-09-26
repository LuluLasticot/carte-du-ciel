uniform float uTime; uniform float uPxAng; uniform float uGrid; uniform float uMW; uniform float uBright;
uniform vec3 uNGP; uniform vec3 uGC; uniform vec4 uBlur;
varying vec3 vDir;
vec3 starLayer(vec3 d, float N, float prob, float seed, float szK){
  vec3 p = d*N;
  vec3 id = floor(p);
  float h = hash13(id + seed);
  if (h > prob) return vec3(0.);
  vec3 sd = normalize(id + .25 + .5*hash33(id + seed*7.));
  float ang = length(cross(d, sd));
  if (dot(d, sd) < 0.) return vec3(0.);
  float m = hash13(id*1.3 + seed);
  float sz0 = .00035*(1. + 2.2*m*m*m)*szK;
  float sz = max(uPxAng*.75, sz0);
  float br = (.1 + 3.4*pow(m, 8.))*exp(-ang*ang/(sz*sz))*min(1., sz0/sz*1.6);
  vec3 tint = mix(vec3(.72, .82, 1.), vec3(1., .82, .62), hash13(id + seed*3.));
  return tint*br*(.8 + .2*sin(uTime*(1. + 3.*m) + h*80.));
}
vec3 skyCol(vec3 d){
  float sb = dot(d, uNGP);
  float b = asin(clamp(sb, -1., 1.));
  vec3 inPl = d - uNGP*sb;
  float lc = dot(normalize(inPl + 1e-5), uGC);
  float band = exp(-pow(b/.19, 2.))*(.3 + .7*pow(.5 + .5*lc, 2.)) + exp(-pow(b/.55, 2.))*.12;
  float n = fbm3l(d*4.);
  float n2 = fbm3l(d*11. + 3.);
  float dust = smoothstep(.45, .72, fbm3l(d*6. + 7.))*exp(-pow(b/.075, 2.));
  vec3 mw = mix(vec3(.5, .58, .9), vec3(1., .84, .66), pow(.5 + .5*lc, 3.));
  vec3 col = mw*band*(.3 + .7*n)*(.55 + .45*n2)*(1. - dust*.85)*uMW*.075;
  col += vec3(.6, .12, .16)*smoothstep(.72, .9, n2)*band*.02*uMW;
  col += starLayer(d, 60., .075, 1., 2.2) + starLayer(d, 140., .05, 2., 1.2)*.55 + starLayer(d, 300., .012 + band*.09, 3., .7)*.4;
  float ra = atan(-d.z, d.x);
  float dec = asin(clamp(d.y, -1., 1.));
  float raS = PI/6., decS = PI/12.;
  float gra = abs(fract(ra/raS + .5) - .5)*raS*cos(dec);
  float gde = abs(fract(dec/decS + .5) - .5)*decS;
  float w = uPxAng*1.2;
  float grid = max(exp(-gra*gra/(w*w))*smoothstep(1.45, 1.2, abs(dec)), exp(-gde*gde/(w*w)));
  col += vec3(.9, .74, .45)*grid*uGrid*.06;
  return col;
}
vec3 rotAxis(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v*c + cross(k, v)*s + k*dot(k, v)*(1. - c); }
void main(){
  vec3 d = normalize(vDir);
  vec3 col;
  if (uBlur.w > .0004) {
    col = vec3(0.);
    for (int i = 0; i < 7; i++) col += skyCol(rotAxis(d, uBlur.xyz, -uBlur.w*float(i)/6.));
    col /= 7.;
  } else col = skyCol(d);
  gl_FragColor = vec4(col*uBright, 1.);
}
