uniform float uTime; uniform float uFade;
varying vec3 vC; varying float vOwned; varying float vHover; varying float vSeed;
void main(){
  vec2 d = gl_PointCoord - .5;
  float r = length(d)*2.;
  vec3 col;
  if (vOwned > .5) {
    // planche possédée : étoile brillante, aigrettes et anneau qui respire
    float core = exp(-r*r*55.)*2.2 + exp(-r*r*9.)*.35;
    float spikes = (exp(-abs(d.x)*70.)*exp(-abs(d.y)*5.) + exp(-abs(d.y)*70.)*exp(-abs(d.x)*5.))*.55*(1. - r);
    float pulse = .5 + .5*sin(uTime*1.6 + vSeed*6.2831);
    float ringR = .5 + .06*pulse + vHover*.08;
    float ring = smoothstep(.035, 0., abs(r - ringR))*(.35 + .35*vHover);
    col = vC*(core + spikes) + mix(vC, vec3(1.), .4)*ring;
  } else {
    // planche à découvrir : cercle en pointillés discret
    float ang = atan(d.y, d.x);
    float dash = step(.35, fract(ang*8./6.2831 + uTime*.03));
    float ring = smoothstep(.06, 0., abs(r - .62))*dash*(.28 + .5*vHover);
    float dot = exp(-r*r*140.)*.35;
    col = vec3(.93, .9, .84)*(ring + dot);
  }
  gl_FragColor = vec4(col*uFade, 1.);
}
