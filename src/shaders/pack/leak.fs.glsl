uniform vec2 uPS; uniform float uLeak; uniform vec3 uLeakCol; uniform float uTime;
varying vec2 vP;
void main(){
  float gu = vP.x/uPS.x + .5;
  float gv = vP.y/uPS.y + .5;
  float tl = tearLine(gu);
  float h = (gv - tl)*uPS.y;
  if (h < 0.) discard;
  float torn = uTearOn < .5 ? 0. : (uDir > 0. ? smoothstep(uFront, uFront - .07, gu) : smoothstep(uFront, uFront + .07, gu));
  float g = exp(-h*8.)*.85 + exp(-h*2.2)*.16;
  float rays = .5 + .5*fbm3v(vec2(gu*16., h*1.4 - uTime*.9));
  float edgeFade = smoothstep(0., .06, gu)*smoothstep(1., .94, gu);
  gl_FragColor = vec4(uLeakCol*g*rays*torn*uLeak*edgeFade*1.5, 1.);
}
