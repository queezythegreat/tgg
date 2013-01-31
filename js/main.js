require.config({
    paths: {
        three: 'three'
    },
    shims: {
         'three/Detector':                    ['three/three.min'],
         'three/libs/stats.min':              ['three/three.min'],
         'three/loaders/ColladaLoader':       ['three/three.min'],
         'three/controls/TrackballControls':  ['three/three.min'],
    },
});

require(['three/three.min',
         'three/Detector',
         'three/libs/stats.min',
         'three/loaders/ColladaLoader',
         'three/controls/TrackballControls'], function () {

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var camera, scene, renderer, objects;
var particleLight, pointLight;
var dae, skin;


this.setup_controls = function (camera) {
    controls = new THREE.TrackballControls(camera);
    controls.target.set( 0, 0, 0 );

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.0;

    controls.noZoom = false;
    controls.noPan = false;
    controls.noRotate = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.15;

    controls.keys = [ 65, 83, 68 ];
    //controls.keys = [ 65, 83, 68 ];

    controls.addEventListener( 'change', render );
};

this.setup_ground_grid = function() {
    var size = 14, step = 1;

    var geometry = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial( { color: 0x3f3030 } );

    for ( var i = - size; i <= size; i += step ) {

        geometry.vertices.push( new THREE.Vector3( - size, - 0.04, i ) );
        geometry.vertices.push( new THREE.Vector3(   size, - 0.04, i ) );

        geometry.vertices.push( new THREE.Vector3( i, - 0.04, - size ) );
        geometry.vertices.push( new THREE.Vector3( i, - 0.04,   size ) );

    }

    var line = new THREE.Line( geometry, material, THREE.LinePieces );
    scene.add( line );
};

this.setup_scene_lighting = function () {
    scene.add( new THREE.AmbientLight( 0xcccccc ) );

    particleLight = new THREE.Mesh(new THREE.SphereGeometry( 4, 8, 8 ),
                                   new THREE.MeshBasicMaterial( { color: 0xffffff } ) );

    var directionalLight = new THREE.DirectionalLight(/*Math.random() * 0xffffff*/0xeeeeee );
    directionalLight.position.x = 2;
    directionalLight.position.y = 3;
    directionalLight.position.z = 50;
    directionalLight.position.normalize();
    scene.add( directionalLight );

    pointLight = new THREE.PointLight( 0xffffff, 4 );
    pointLight.position = particleLight.position;
    scene.add( pointLight );
    //scene.add( particleLight );
}

this.setup_renderer = function() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    container.appendChild( renderer.domElement );
}

this.setup_stats = function() {
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    container.appendChild( stats.domElement );
};

this.load_model = function (model_url) {
    var loader = new THREE.ColladaLoader();
    loader.options.convertUpAxis = true;
    loader.load(model_url, this.setup_model);
}

this.setup_model = function(model) {
    dae = model.scene;
    skin = model.skins[ 0 ];

    dae.scale.x = dae.scale.y = dae.scale.z = 0.202;
    dae.position.x = -8;
    dae.rotation.x = 1.56;
    dae.updateMatrix();

    // Add the COLLADA
    scene.add( dae );
}

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    //camera.position.set( 2, 10, 10 );
    camera.position.set(-1.22, 10.61, 14.11);


    this.setup_controls(camera);
    this.setup_ground_grid();
    this.setup_scene_lighting()
    this.setup_stats();
    this.setup_renderer()

    window.addEventListener( 'resize', onWindowResize, false );

    this.load_model('untitled.dae');

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

var t = 0;
var clock = new THREE.Clock();

function animate() {
    var delta = clock.getDelta();

    requestAnimationFrame( animate );

    if ( t > 1 ) t = 0;

    if ( skin ) {
        // guess this can be done smarter...

        // (Indeed, there are way more frames than needed and interpolation is not used at all
        //  could be something like - one morph per each skinning pose keyframe, or even less,
        //  animation could be resampled, morphing interpolation handles sparse keyframes quite well.
        //  Simple animation cycles like this look ok with 10-15 frames instead of 100 ;)

        for ( var i = 0; i < skin.morphTargetInfluences.length; i++ ) {
            skin.morphTargetInfluences[ i ] = 0;
        }

        skin.morphTargetInfluences[ Math.floor( t * 30 ) ] = 1;

        t += delta;
    }

    stats.update();
    controls.update();
    render();
}

function render() {
    var timer = Date.now() * 0.0005;

    //camera.position.x = Math.cos( timer ) * 10;
    //camera.position.y = 2;
    //camera.position.z = Math.sin( timer ) * 10;

    camera.lookAt( scene.position );

    //particleLight.position.x = Math.sin( timer * 4 ) * 3009;
    //particleLight.position.y = Math.cos( timer * 5 ) * 4000;
    //particleLight.position.z = Math.cos( timer * 4 ) * 3009;

    renderer.render(scene, camera);
}

init();

});
