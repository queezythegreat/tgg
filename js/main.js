require.config({
    paths: {
        three: 'three'
    },
    shim: {
         'three/Detector':                    ['three/three.min'],
         'three/libs/stats.min':              ['three/three.min'],
         'three/loaders/ColladaLoader':       ['three/three.min'],
         'three/controls/TrackballControls':  ['three/three.min'],
         'three/controls/FirstPersonControls': ['three/three.min'],
         'three/controls/PointerLockControls':    ['three/three.min'],
    },
});
var camera;
require(['three/three.min',
         'three/Detector',
         'three/libs/stats.min',
         'three/loaders/ColladaLoader',
         'three/controls/FirstPersonControls',
         'three/controls/PointerLockControls',
         'three/controls/TrackballControls'], function () {

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var  scene, renderer, objects;
var particleLight, pointLight;
var dae, skin;
var light;
var time;
var objects = [];
var rays;
var clock = new THREE.Clock();


this.setup_controls = function () {
    /**
    controls = new THREE.TrackballControls(camera);
    controls.target.set( 0, 0, 0 );

    controls.noZoom = false;
    controls.noPan = false;
    controls.noRotate = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.15;

    controls.keys = [ 65, 83, 68 ];
    //controls.keys = [ 65, 83, 68 ];

    controls.addEventListener('change', render);

    controls = new THREE.FirstPersonControls( camera );
    **/

    controls = new THREE.FirstPersonControls(camera);
    controls.target.set( 0, 0, 0 );
    controls.movementSpeed = 1000;
    controls.lookSpeed = 0.125;
    controls.lookVertical = true;
	controls.mouseDragOn = true;
};

this.setup_ground_plane = function() {
    var planeGeo = new THREE.PlaneGeometry(8000, 8000, 10, 10);
    var planeMat = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
    var plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI/2;
    plane.position.y = 0;
    plane.receiveShadow = true;
    scene.add(plane);

};

this.setup_scene_lighting = function () {
    light_model = new THREE.Mesh(new THREE.SphereGeometry( 0.5, 8, 8 ),
                                   new THREE.MeshBasicMaterial( { color: 0x000000 } ) );

    light = new THREE.SpotLight( 0xffffff, 1.5 );
    light.position.set( 600, 600, 800);
    light.castShadow = true;

    light.shadowCameraNear = 0;
    light.shadowCameraFar = camera.far;
    light.shadowCameraFov = 70;
    light.shadowBias = -0.0022;
    light.shadowDarkness = 0.9;
    light.shadowMapWidth = 2048;
    light.shadowMapHeight = 2048;
    light_model.position = light.position;

    scene.add(light); 
    scene.add(light_model);
}

this.setup_renderer = function() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMapEnabled = true;
    renderer.shadowMapType = THREE.PCFShaddowMap;

    container.appendChild( renderer.domElement );

    window.addEventListener('resize', onWindowResize, false );
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

    dae.scale.x = dae.scale.y = dae.scale.z = 10;
    dae.position.x = -400;
    dae.rotation.x = 1.56;
    dae.updateMatrix();
    dae.castShadow = true;
    dae.receiveShadow = true;
    console.log(model);

    ass = dae.getChildByName("Assem1");
    ass.material = new THREE.MeshLambertMaterial( { color: 0xd4d0c8 } );
    ass.castShadow = true;
    ass.receiveShadow = true;
    objects += dae;
    console.log(ass);

    // Add the COLLADA
    scene.add( dae );
}

this.setup_pointer_controls = function() {
    this.setup_pointer_lock();

    controls = new THREE.PointerLockControls(camera);
    scene.add(controls.getObject());

}

var timmer = Date.now();
function create_rays(camera_location, pitch) {
    var rays = {
        up:        new THREE.Raycaster(),
        down:      new THREE.Raycaster(),
        left:      new THREE.Raycaster(),
        right:     new THREE.Raycaster(),
        forward:   new THREE.Raycaster(),
        backward:  new THREE.Raycaster(),
    };
    rays.up.ray.direction.set( 0,    1,  0);
    rays.down.ray.direction.set( 0, -1,  0);

    rays.left.ray.direction.set( 1,  0,  0);
    rays.right.ray.direction.set(-1,  0,  0);

    rays.forward.ray.direction.set( 0,  0,  1);
    rays.backward.ray.direction.set( 0,  0, -1);


    var y_axis = new THREE.Vector3(0, 1, 0);
    //var line_color = new THREE.LineBasicMaterial({color: 0x0000ff});
    for (var key in rays) {
        rays[key].ray.origin.copy(camera_location.position);
        //rays[key].ray.origin.y -= 1;
        
        if (key === "up" || key == "down")
            continue;
        
        rotate_vector(rays[key].ray.direction, y_axis, camera_location.rotation.y);


        /**
        if (Date.now() - timmer > 1) {
            var line_geometry = new THREE.Geometry();
            line_geometry.vertices.push(rays[key].ray.origin);
            var direction = new THREE.Vector3();
            direction.addVectors(rays[key].ray.origin, rays[key].ray.direction)
            line_geometry.vertices.push(direction);
            scene.add(new THREE.Line(line_geometry, line_color));

            timmer = Date.now();
        }
        **/
    }

    return rays;
}

this.setup_scene = function() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0xffffff, 1, 3000 );
    scene.fog.color.setHSV( 0.6, 0, 1 ); 


    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.set(0, 0, 0);
    //camera.position.set(58.90, 275.27, 974.96);
}
function init() {
    this.setup_scene();

    this.setup_pointer_controls();

    //this.setup_controls();
    this.setup_ground_plane();
    this.setup_scene_lighting()
    this.setup_stats();
    this.setup_renderer()

    this.load_model('untitled.dae');

    controls.getObject().position.set(58.90, 700.27, 600.96);
    this.animate();
}

this.setup_pointer_lock = function () {
    var blocker = document.getElementById( 'blocker' );
    var instructions = document.getElementById( 'instructions' );

    // http://www.html5rocks.com/en/tutorials/pointerlock/intro/

    var havePointerLock = 'pointerLockElement' in document ||
                          'mozPointerLockElement' in document ||
                          'webkitPointerLockElement' in document;

    if (havePointerLock) {
        var element = document.body;

        var pointerlockchange = function ( event ) {
            if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

                controls.enabled = true;

                blocker.style.display = 'none';
            } else {
                controls.enabled = false;

                blocker.style.display = '-webkit-box';
                blocker.style.display = '-moz-box';
                blocker.style.display = 'box';

                instructions.style.display = '';
            }
        }

        var pointerlockerror = function ( event ) {
            instructions.style.display = '';
        }

        // Hook pointer lock state change events
        document.addEventListener( 'pointerlockchange', pointerlockchange, false );
        document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
        document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

        document.addEventListener( 'pointerlockerror', pointerlockerror, false );
        document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
        document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

        instructions.addEventListener( 'click', function ( event ) {
            instructions.style.display = 'none';

            // Ask the browser to lock the pointer
            element.requestPointerLock = element.requestPointerLock    ||
                                         element.mozRequestPointerLock ||
                                         element.webkitRequestPointerLock;

            if ( /Firefox/i.test( navigator.userAgent ) ) {
                var fullscreenchange = function ( event ) {
                    if ( document.fullscreenElement === element ||
                         document.mozFullscreenElement === element ||
                         document.mozFullScreenElement === element ) {

                        document.removeEventListener( 'fullscreenchange', fullscreenchange );
                        document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

                        element.requestPointerLock();
                    }
                }
                document.addEventListener( 'fullscreenchange', fullscreenchange, false );
                document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

                element.requestFullscreen = element.requestFullscreen ||
                                            element.mozRequestFullscreen ||
                                            element.mozRequestFullScreen ||
                                            element.webkitRequestFullscreen;

                element.requestFullscreen();
            } else {
                element.requestPointerLock();
            }
        }, false );
    } else {
        instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
    }
}

function does_intersect(objects, ray, min, max) {
    var intersections = ray.intersectObjects(objects);
    if (intersections.length > 0) {
      //console.log("Collision detected: " + intersections[0].distance);
      var distance = intersections[0].distance;
      if (distance > min && distance < max)
          return true; 
    }
    return false;
}

function rotate_vector(vector, axis, angle) {
    var matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);

    vector.applyMatrix4(matrix);
}

function update_pointer_controls() {
    if (dae) {
        objects = [dae.getChildByName("Assem1")];

        var rays = create_rays(controls.getObject(), controls.getPitch());

        controls.canMoveLeft     = !does_intersect(objects, rays.left,     0, 20);
        controls.canMoveRight    = !does_intersect(objects, rays.right,    0, 20);
        controls.canMoveForward  = !does_intersect(objects, rays.forward,  0, 20);
        controls.canMoveBackward = !does_intersect(objects, rays.backward, 0, 20);

        controls.isOnObject(does_intersect(objects, rays.down, 0, 10));

        /**
        if (!controls.canMoveLeft)
            console.log('Collision: Left');
        if (!controls.canMoveRight)
            console.log('Collision: Right');
        if (!controls.canMoveForward)
            console.log('Collision: Forward');
        if (!controls.canMoveBackward)
            console.log('Collision: Backward');
        **/



        controls.update(Date.now()-time);
        time = Date.now();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

this.animate = function () {
    requestAnimationFrame(this.animate);

    stats.update();
    update_pointer_controls();
    //controls.update();
    //controls.update( clock.getDelta() );
    render();
}


function render() {
    renderer.render(scene, camera);
}

init();

});
