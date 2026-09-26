varying vec3 vC; varying float vA;
void main(){
  vec2 d = gl_PointCoord - .5; float r2 = dot(d, d)*4.;
  float a = exp(-r2*3.5)*.55 + exp(-r2*22.)*1.4;
  gl_FragColor = vec4(vC*a*vA, 1.);
}
