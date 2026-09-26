uniform float uDraw; uniform float uAlpha; uniform vec3 uCol;
varying float vT; varying float vIdx; varying float vSide;
void main(){
  float local = clamp(uDraw - vIdx, 0., 1.);
  if (vT > local) discard;
  float a = smoothstep(0., .7, 1. - abs(vSide));
  gl_FragColor = vec4(uCol*a*uAlpha, 1.);
}
