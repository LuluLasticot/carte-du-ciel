uniform vec3 uCol;
varying float vA;
void main(){
  vec2 d = gl_PointCoord - .5; float r2 = dot(d, d)*4.;
  float a = exp(-r2*2.6)*.45 + exp(-r2*10.)*1.9;
  gl_FragColor = vec4(mix(uCol, vec3(1.), .5)*a*vA, 1.);
}
