import * as THREE from './three.module.min.js';
// A local, static 3D bloom gives the desktop a shaded, folded-silk wallpaper.
const host=document.getElementById('wallpaper');
try{
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:innerWidth>800,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,40);camera.position.set(0,0,10);
 scene.add(new THREE.HemisphereLight('#c9f0ff','#153476',2));
 const key=new THREE.DirectionalLight('#b3e5ff',4);key.position.set(-4,5,6);scene.add(key);
 const rim=new THREE.DirectionalLight('#347eff',3);rim.position.set(3,-1,1);scene.add(rim);
 const bloom=new THREE.Group();bloom.position.set(.55,-.1,0);bloom.rotation.set(.6,-.38,1.2);bloom.scale.set(1.25,.95,.6);scene.add(bloom);
 const geometry=new THREE.TorusKnotGeometry(1.7,.63,180,26,2,3);
 const blue=new THREE.MeshStandardMaterial({color:'#1262d1',roughness:.29,metalness:.2});
 const silk=new THREE.Mesh(geometry,blue);bloom.add(silk);
 const inner=new THREE.Mesh(new THREE.TorusKnotGeometry(1.34,.4,150,22,2,3),new THREE.MeshStandardMaterial({color:'#2381e8',roughness:.25,metalness:.18}));inner.rotation.set(.3,.2,.65);inner.position.z=-.15;bloom.add(inner);
 function render(){camera.aspect=innerWidth/innerHeight;camera.position.z=innerWidth<650?12.5:10;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.render(scene,camera)}
 render();host.querySelector('.bloom')?.remove();addEventListener('resize',render);
}catch(e){/* Native CSS wallpaper remains in place on devices without WebGL. */}
