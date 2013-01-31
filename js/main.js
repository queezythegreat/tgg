require.config({
    paths: {
        kick: 'common/kick-debug'
    }
});

require(['kick'],
function (kick) {

var vec3 = kick.math.Vec3;
var aabb = kick.math.Aabb;
var objectCenter = vec3.create();
var sphericalCoordinates = vec3.clone([10, 0, 0]); // radius, polar, elevation

function createDummyUVsIfNotExist() {
    var mesh = meshRenderer.mesh,
        meshData = mesh.meshData;
    if (!meshData.uv1){
        meshData.createUv1();
        mesh.meshData = meshData;
        meshRenderer.mesh = mesh;
    }
}

function recalculateNormals() {
    var mesh = meshRenderer.mesh,
        meshData = mesh.meshData;
    if (!meshData.interleavedArrayFormat.normal){
        console.log("Recalculate normals");
        meshData.recalculateNormals();
        mesh.meshData = meshData;
    }
}

function destroyAllMeshRenderersInScene() {
    var scene = engine.activeScene,
        i,
        gameObject;
    for (i = scene.getNumberOfGameObjects() - 1; i >= 0; i--) {
        gameObject = scene.getGameObject(i);
        if (gameObject.getComponentOfType(kick.scene.MeshRenderer)) {
            gameObject.destroy();
        }
    }
}

function load(content, url, func, rotateAroundX) {
    //destroyAllMeshRenderersInScene();

    var createdObject = func(content, engine.activeScene, rotateAroundX),
        gameObjectsCreated = createdObject.gameObjects,
        boundingBox = aabb.create(),
        i,
        gameObject,
        meshRendererNew,
        meshAabb,
        aabbTransformed,
        materials,
        j,
        length,
        lengthPlusOffset;
    for (i = 0; i < gameObjectsCreated.length; i++) {
        gameObject = gameObjectsCreated[i];
        meshRendererNew = gameObject.getComponentOfType(kick.scene.MeshRenderer);
        if (meshRendererNew) {
            meshAabb = meshRendererNew.mesh.aabb;
            aabbTransformed = aabb.transform(meshAabb, meshAabb, gameObject.transform.getGlobalMatrix());
            aabb.merge(boundingBox, boundingBox, aabbTransformed);
            console.log(boundingBox);
            materials = [];
            for (j = meshRendererNew.mesh.meshData.subMeshes.length - 1; j >= 0; j--) {
                materials[j] = material;
            }
            meshRendererNew.materials = materials;
            meshRenderer = meshRendererNew;
            recalculateNormals();
            createDummyUVsIfNotExist();
        }
    }
    aabb.center(objectCenter, boundingBox);
    length = vec3.length(aabb.diagonal(vec3.create(), boundingBox)) * 0.5;
    lengthPlusOffset = length * 2.5;

    sphericalCoordinates[0] = lengthPlusOffset;
}
function loadKickJSModel(fileContent) {
    destroyAllMeshRenderersInScene();
    var meshData = new kick.mesh.MeshData(),
        gameObject,
        mesh,
        materials,
        j,
        meshRenderer,
        boundingBox,
        length,
        lengthPlusOffset;
    meshData.deserialize(fileContent);
    gameObject = engine.activeScene.createGameObject({name: meshData.name});
    mesh = new kick.mesh.Mesh({
        meshData: meshData
    });
    materials = [];
    for (j = meshData.subMeshes.length - 1; j >= 0; j--) {
        materials[j] = material;
    }

    meshRenderer = new kick.scene.MeshRenderer({
        mesh: mesh,
        materials: materials
    });
    gameObject.addComponent(meshRenderer);
    boundingBox = mesh.aabb;
    aabb.center(objectCenter, boundingBox);
    length = vec3.length(aabb.diagonal(vec3.create(), boundingBox)) * 0.5;
    lengthPlusOffset = length * 2.5;

    sphericalCoordinates[0] = lengthPlusOffset;
}

function initLights() {
    var ambientlightGameObject = engine.activeScene.createGameObject();
    ambientlightGameObject.name = "ambient light";
    var ambientLight = new kick.scene.Light({type: kick.scene.Light.TYPE_AMBIENT});
    ambientLight.color = [0.1, 0.1, 0.1];
    ambientlightGameObject.addComponent(ambientLight);

    var lightGameObject = engine.activeScene.createGameObject();
    lightGameObject.name = "directional light";
    var light = new kick.scene.Light(
        {
            type: kick.scene.Light.TYPE_DIRECTIONAL,
            color:[1,1,1],
            intensity:1
        }
    );
    lightGameObject.transform.position = [1,1,1];
    lightGameObject.addComponent(light);
    lightGameObject.addComponent(new LightRotatorComponent());
}

function loadObj(url) {
    var oReq = new XMLHttpRequest();
    function handler() {
        if (oReq.readyState === 4) { // complete
            if (oReq.status === 200) {
                var txt = oReq.responseText;
                load(txt, url, kick.importer.ObjImporter.import);
            }
        }
    }
    oReq.open("GET", url, true);
    oReq.onreadystatechange = handler;
    oReq.send();
}

function loadCollada(url) {
    var oReq = new XMLHttpRequest();
    function handler() {
        if (oReq.readyState === 4) { // complete
                console.log("Got: " + url + " Status: " + oReq.status);
            if (oReq.status === 200) {
                var xmlDom = oReq.responseText;
                console.log(oReq);
                load(xmlDom, url, kick.importer.ColladaImporter.import);
            }
        }
    }
    oReq.open("GET", url, true);
    oReq.onreadystatechange = handler;
    oReq.send();
}


function loadKickJSModelFromURL(url) {
    var oReq = new XMLHttpRequest();
    function handler() {
        if (oReq.readyState === 4) { // complete
            if (oReq.status === 200) {
                var content = oReq.response;
                loadKickJSModel(content);
            }
        }
    }
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";
    oReq.onreadystatechange = handler;
    oReq.send();
}

endsWith = function (str, search) {
    var res = str.match(search + "$");
    if (Array.isArray(res)){
      res = res[0];
    }
    return (res === search);
};

function loadModelFile(file, rotateAroundX) {
    var reader = new FileReader(),
        fileName = file.fileName || file.name,
        fileNameLowercase = fileName.toLowerCase(),
        parser;

    reader.onload = function (event) {
        var fileContent = event.target.result;

        if (endsWith(fileNameLowercase, ".obj")) {
            load(fileContent, fileName, kick.importer.ObjImporter.import,rotateAroundX);
        } else if (endsWith(fileNameLowercase, ".dae")) {
            parser = new DOMParser();
            load(parser.parseFromString(fileContent, "text/xml"), fileName, kick.importer.ColladaImporter.import,rotateAroundX);
        } else if (endsWith(fileNameLowercase, ".kickjs")) {
            loadKickJSModel(fileContent);
        }
    };

    reader.onerror = function () {
        alert("Error reading file");
    };
    if (endsWith(fileNameLowercase, ".kickjs")) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function LightRotatorComponent() {
    var thisObj = this,
        transform,
        rotationSensitivity = 1,
        rotationEuler,
        mouseInput;
    this.activated = function () {
        var gameObject = thisObj.gameObject,
            engine = kick.core.Engine.instance;
        transform = gameObject.transform;
        rotationEuler = transform.localRotationEuler;
        mouseInput = engine.mouseInput;
    };

    this.update = function () {
        transform.localRotationEuler = rotationEuler;
        if (mouseInput.isButton(2)) {
            var mouseDelta = mouseInput.deltaMovement;
            rotationEuler[1] += mouseDelta[0] * rotationSensitivity;
            rotationEuler[0] += mouseDelta[1] * rotationSensitivity;
            transform.localRotationEuler = rotationEuler;
        }
    };
}


var RotatorComponent = function(config){
    var rotationEuler = [0,0,0],
            thisObj = this;

    this.rotationSpeed = config.rotationSpeed;

    this.update = function(){
        var gameObject = thisObj.gameObject,
                transform = gameObject.transform,
                time = kick.core.Engine.instance.time,
                deltaTime = time.deltaTime;
        rotationEuler[2] += deltaTime*thisObj.rotationSpeed;
        transform.localRotationEuler = rotationEuler;
    };
};

// init engine (create 3d context)
var engine = new kick.core.Engine('canvas');

// create a game object in [0,0,0] facing down the -z axis
var cameraObject = engine.activeScene.createGameObject();
cameraObject.transform.position = [0,0,5];
console.log(cameraObject.transform.rotation);
console.log(cameraObject.transform.rotationEuler);
cameraObject.transform.rotationEuler = [20, 0, 20];
//cameraObject.transform.rotation = [0.4,0,0.1,1];

// create a orthographic camera
var camera = new kick.scene.Camera({
    perspective: false,
    left:30,
    right:50,
    top:50,
    bottom:-50
});
cameraObject.addComponent(camera);

// create material
var shader = engine.project.load(engine.project.ENGINE_SHADER_UNLIT);
var material = new kick.material.Material({
    shader: shader
});


// create meshes
var meshes = [engine.project.ENGINE_MESH_TRIANGLE, engine.project.ENGINE_MESH_CUBE];
for (var i=0;i<meshes.length;i++){
    var gameObject = engine.activeScene.createGameObject();
    gameObject.transform.position = [-2.0+4*i,0,0];
    var meshRenderer = new kick.scene.MeshRenderer();
    meshRenderer.mesh = engine.project.load(meshes[i]);
    meshRenderer.material = material;
    gameObject.addComponent(meshRenderer);
    var rotationSpeed = i-0.4;
    gameObject.addComponent(new RotatorComponent({rotationSpeed:rotationSpeed}));
}
loadCollada("untitled.dae");
initLights();
window.fullscreen = function(){
    if (engine.isFullScreenSupported()){
        engine.setFullscreen(true);
    } else {
        alert("Fullscreen is not supported in this browser");
    }
}
});
