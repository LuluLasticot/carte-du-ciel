uniform float uTime; uniform float uInt; uniform float uFan; uniform vec3 uCol; uniform float uPrism;
varying vec2 vUv;
void main(){
  vec2 p = vUv*2. - 1.;
  float r = length(p);
  float a = atan(p.y, p.x);
  float rays = (pow(.5 + .5*sin(a*7. + uTime*.22), 6.)*.6 + pow(.5 + .5*sin(a*17. - uTime*.37 + 1.3), 12.)*.4)*(.55 + .6*fbm3v(vec2(a*2.5, r*2. - uTime*.3)));
  float fall = exp(-r*2.4)*smoothstep(0., .1, r)*smoothstep(1., .72, r);
  float fan = uFan > 0. ? smoothstep(uFan, uFan*.35, abs(atan(p.x, p.y))) : 1.;
  vec3 c = mix(uCol, spectrum(a*.477 + r*.6 - uTime*.05)*1.2, uPrism);
  gl_FragColor = vec4(c*rays*fall*fan*uInt, 1.);
}
