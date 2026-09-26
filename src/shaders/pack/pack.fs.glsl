uniform sampler2D uTex; uniform sampler2D uMsk; uniform sampler2D uTexB; uniform sampler2D uMskB;
uniform float uFoilType; uniform float uTime; uniform float uGleam; uniform float uFlipU;
uniform float uLeak; uniform vec3 uLeakCol; uniform float uFade;
varying vec2 vUv; varying vec3 vPosV; varying vec3 vNrmV; varying vec3 vTanV; varying vec3 vBitV;
vec3 foilTint(vec2 guv, vec2 tilt){
  if (uFoilType < .5) return vec3(.9, .93, .97);
  if (uFoilType < 1.5) return vec3(1., .74, .32);
  return .5 + .5*spectrum(dot(tilt, vec2(1.2, .8))*1.5 + guv.x*1.2 + guv.y*.8 + uTime*.03);
}
void main(){
  vec2 guv = vec2(uFlipU > .5 ? 1. - vUv.x : vUv.x, vUv.y);
  float tl = tearLine(guv.x);
  float torn = tornAt(guv.x);
  float above = guv.y - tl;
#ifdef STRIP
  if (torn < .5 || above < 0.) discard;
#else
  if (torn > .5 && above > 0.) discard;
#endif
  vec4 tex; vec4 msk;
#ifdef STRIP
  if (gl_FrontFacing) { tex = texture2D(uTex, vUv); msk = texture2D(uMsk, vUv); }
  else { tex = texture2D(uTexB, vec2(1. - vUv.x, vUv.y)); msk = texture2D(uMskB, vec2(1. - vUv.x, vUv.y)); }
#else
  tex = texture2D(uTex, vUv); msk = texture2D(uMsk, vUv);
#endif
  vec3 V = normalize(-vPosV);
  vec3 N = normalize(vNrmV);
  if (!gl_FrontFacing) N = -N;
  vec3 T = normalize(vTanV), B = normalize(vBitV);
  vec3 Vt = vec3(dot(V, T), dot(V, B), dot(V, N));
  vec2 tilt = Vt.xy/max(Vt.z, .3);
  float edgeY = min(guv.y, 1. - guv.y);
  float cr = (vnoise(guv*vec2(7., 11.)) - .5)*.5 + (vnoise(guv*vec2(26., 40.) + 3.) - .5)*.22 + (vnoise(guv*vec2(70., 90.) + 9.) - .5)*.08;
  float crk = .35 + .65*(1. - smoothstep(.06, .22, edgeY)) + .3*(1. - smoothstep(0., .12, min(guv.x, 1. - guv.x)));
  float seal = 1. - smoothstep(.05, .058, edgeY);
  float ridge = sin(guv.x*380.)*seal;
  vec3 Np = normalize(N + (cr*crk*.55 + ridge*.5)*T + cr*crk*.45*B);
  vec3 e = envMap(reflect(-V, Np));
  float fres = pow(1. - clamp(dot(Np, V), 0., 1.), 4.);
  vec3 Lk = normalize(vec3(-.45, .6, .66));
  vec3 ft = foilTint(guv, tilt);
  float foil = msk.r;
  vec3 base = tex.rgb;
  vec3 col = base*(.5 + .6*max(dot(Np, Lk), 0.)) + e*base*.9 + e*ft*foil*1.05 + e*ft*.05 + fres*e*.16;
  col += spectrum(dot(tilt, vec2(1.4, .9))*1.3 + guv.y*2. + guv.x)*msk.g*(.15 + .5*e.g)*.55;
  float gl = exp(-pow((guv.x*.7 + guv.y*.55 - uGleam)*7., 2.));
  col += vec3(1., .98, .95)*gl*(.1 + .75*foil);
  float fw = .0045 + .004*vnoise(vec2(guv.x*90., 2.));
#ifdef STRIP
  float fib = torn*smoothstep(fw, fw*.3, above);
#else
  float fib = torn*smoothstep(fw, fw*.3, -above);
  col += uLeakCol*torn*exp(above*55.)*uLeak*2.4;
#endif
  col = mix(col, vec3(.86, .85, .82)*(.75 + .45*vnoise(vec2(guv.x*500., guv.y*1100.))), fib*.95);
  gl_FragColor = vec4(col*uFade, 1.);
}
