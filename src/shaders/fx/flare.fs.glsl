uniform vec3 uCol; uniform float uInt;
varying vec2 vUv;
void main(){
  vec2 p = vUv*2. - 1.;
  float r = length(p);
  float core = exp(-r*r*160.)*3. + exp(-r*r*20.)*.7 + exp(-r*4.5)*.22;
  float sp = (exp(-abs(p.y)*110.)*exp(-abs(p.x)*2.4) + exp(-abs(p.x)*110.)*exp(-abs(p.y)*2.4))*.9;
  vec3 c = uCol*(core + sp);
  gl_FragColor = vec4(c*uInt*smoothstep(1., .8, r), 1.);
}
