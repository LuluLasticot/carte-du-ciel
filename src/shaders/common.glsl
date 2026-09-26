#define PI 3.14159265
#define TAU 6.28318531
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz)*p3.zy); }
float hash13(vec3 p3){ p3 = fract(p3*.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y)*p3.z); }
vec3 hash33(vec3 p3){ p3 = fract(p3*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx)*p3.zyx); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3. - 2.*f);
  return mix(mix(hash12(i), hash12(i + vec2(1.,0.)), u.x), mix(hash12(i + vec2(0.,1.)), hash12(i + vec2(1.,1.)), u.x), u.y); }
float vnoise3(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f*f*(3. - 2.*f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1.,0.,0.)), u.x), mix(hash13(i + vec3(0.,1.,0.)), hash13(i + vec3(1.,1.,0.)), u.x), u.y),
             mix(mix(hash13(i + vec3(0.,0.,1.)), hash13(i + vec3(1.,0.,1.)), u.x), mix(hash13(i + vec3(0.,1.,1.)), hash13(i + vec3(1.,1.,1.)), u.x), u.y), u.z); }
const mat2 FBM_R = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = FBM_R*p + 7.3; a *= .5; } return s; }
float fbm3v(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++){ s += a*vnoise(p); p = FBM_R*p + 7.3; a *= .5; } return s/.875; }
float fbm3(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a*vnoise3(p); p = p*2.03 + vec3(1.7, 9.2, 4.1); a *= .5; } return s; }
float fbm3l(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++){ s += a*vnoise3(p); p = p*2.03 + vec3(1.7, 9.2, 4.1); a *= .5; } return s/.875; }
vec2 rot2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec3 spectrum(float x){ return clamp(.5 + .5*cos(TAU*(x + vec3(0., .33, .67))), 0., 1.); }
// studio : une grande boîte à lumière derrière l'observateur, une clé en haut à gauche, un contre-jour à droite
vec3 envMap(vec3 R){
  vec2 d0 = R.xy - vec2(-.12, .2);
  float front = exp(-dot(d0, d0)*5.);
  float key = exp(-pow((R.x + .62)*3., 2.) - pow((R.y - .45)*2.2, 2.));
  float rim = exp(-pow((R.x - .72)*4., 2.) - pow(R.y*1.5, 2.));
  float top = smoothstep(.55, 1., R.y);
  return vec3(.03, .034, .045) + vec3(1., .97, .93)*front*1.2 + vec3(1., .95, .88)*key*1.7 + vec3(.72, .85, 1.)*rim*1.15 + vec3(.9, .92, 1.)*top*.45;
}
