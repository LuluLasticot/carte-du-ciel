attribute float aMag; attribute float aDelay;
uniform float uT; uniform float uPx; uniform float uAlpha;
varying float vA;
void main(){
  float k = clamp((uT - aDelay)/.22, 0., 1.);
  float pop = k*(1. + sin(k*3.14159)*.8);
  vA = k*uAlpha;
  vec4 mv = modelViewMatrix*vec4(position, 1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = max((7. + (4.8 - aMag)*3.6)*pop*uPx, 0.);
}
