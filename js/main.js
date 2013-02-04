require.config({
    paths: {
        three: 'three'
    },
    shim: {
         'three/Detector':                     ['three/three.min'],
         'three/libs/stats.min':               ['three/three.min'],
         'three/loaders/ColladaLoader':        ['three/three.min'],
         'FPSControls':                        ['three/three.min'],
    },
});
var camera;
require(['three/three.min',
         'three/Detector',
         'three/libs/stats.min',
         'three/loaders/ColladaLoader',
         'FPSControls'], function () {

    if (!Detector.webgl)
        Detector.addGetWebGLMessage();

    var container, stats;

    var scene, renderer
    var plane;
    var particleLight, pointLight;
    var dae, skin;
    var clock = new THREE.Clock();

    function init() {
        this.setup_scene();
        this.setup_ground_plane();

        this.setup_fps_controls();

        this.setup_scene_lighting()
        this.setup_stats();
        this.setup_renderer()

        this.load_model('untitled.dae');

        controls.getObject().position.set(58.90, 700.27, 600.96);
        animate();
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

    this.setup_ground_plane = function() {
        var planeGeo = new THREE.PlaneGeometry(8000, 8000, 10, 10);
        var planeMat = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
        plane = new THREE.Mesh(planeGeo, planeMat);
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
        console.log(ass);

        // Add the COLLADA
        scene.add( dae );

        controls.objects.push(ass);
    }

    this.setup_fps_controls = function() {
        controls = new THREE.FPSControls(camera);

        controls.setup_pointer_lock('blocker', 'instructions');
        controls.movement_speed = 0.3;
        controls.mouse_sensitivity = 0.01;
        controls.field_of_view = Math.PI/4;
        controls.gravity = 20;
        controls.objects.push(plane);

        scene.add(controls.getObject());
    }

    function draw_line(origin, direction, color) {
        var origin_offset = new THREE.Vector3();
        origin_offset.copy(origin);
        origin_offset.y -= 8;
        var line_color = new THREE.LineBasicMaterial({color: color});

        var line_geometry = new THREE.Geometry();
        line_geometry.vertices.push(origin_offset);

        var point = new THREE.Vector3();
        point.addVectors(origin_offset, direction)
        line_geometry.vertices.push(point);

        scene.add(new THREE.Line(line_geometry, line_color));
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    var animate = function () {
        requestAnimationFrame(animate);

        stats.update();
        controls.update(clock.getDelta());

        render();
    }


    function render() {
        renderer.render(scene, camera);
    }

    init();
});
