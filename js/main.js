var container;
var camera, scene, renderer;
var clock = new THREE.Clock();
var geom = new THREE.Geometry;;
var keyboard = new THREEx.KeyboardState();
const N = 512;

var t = [0, 1, 2, 3];
var T = 10;


function init()
{
    container = document.getElementById( 'container' );
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000 );
    camera.position.set(500, 500, 0);
    camera.lookAt(new THREE.Vector3( N/2, 0, N/2));

    // var ambient = new THREE.AmbientLight(0x202020);
    // scene.add(ambient);

    // spotlight = new THREE.PointLight( 0xffffff );
    // spotlight.position.set(30,100,0);
    // scene.add(spotlight);

    var light = new THREE.DirectionalLight(0xffffff);
    // позиция источника освещения
    light.position.set( 1500, 500, 1000);
    // направление освещения
    light.target = new THREE.Object3D();
    light.target.position.set(  N/2, 0, N/2 );
    scene.add(light.target);
    // включение расчёта теней
    light.castShadow = true;
    // параметры области расчёта теней
    light.shadow = new THREE.LightShadow( new THREE.PerspectiveCamera( 70, 1, 1, 2500 ) );
    light.shadow.bias = 0.0001;
    // размер карты теней
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    scene.add( light );
    
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( 0x11aa11, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );

    var helper = new THREE.CameraHelper(light.shadow.camera);
    scene.add( helper );

    mixer = new THREE.AnimationMixer( scene );
    CreateGeometry();
    //spawnModels();
    
}


function CreateGeometry(){
    var depth = N;
    var width = N;

    var canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    var ctx = canvas.getContext('2d');

    var img = new Image();
    img.src = "pics/plateau.jpg";
    
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
            var pixel = ctx.getImageData(0, 0, width, depth);

            
            for (var x = 0; x < depth; x++) {
                for (var z = 0; z < width; z++) {
                    var yValue = pixel.data[z * 4 + (depth * x * 4)]/3;
                    var vertex = new THREE.Vector3(x, yValue, z );
                    geom.vertices.push(vertex);
                }

                
            }
            
            for (var z = 0; z < depth - 1; z++) {
                for (var x = 0; x < width - 1; x++) {
                    var a = x + z * width;
                    var b = (x + 1) + (z * width);
                    var c = x + ((z + 1) * width);
                    var d = (x + 1) + ((z + 1) * width);

                    var face1 = new THREE.Face3(a, b, d);
                    var face2 = new THREE.Face3(d, c, a);

                    geom.faces.push(face1);
                    geom.faces.push(face2);

                    geom.faceVertexUvs[0].push([new THREE.Vector2((x)/(width-1), (z)/(depth-1)),
                        new THREE.Vector2((x+1)/(width-1), (z)/(depth-1)),
                        new THREE.Vector2((x+1)/(width-1), (z+1)/(depth-1))]);
            
                    geom.faceVertexUvs[0].push([new THREE.Vector2((x+1)/(width-1), (z+1)/(depth-1)),
                        new THREE.Vector2((x)/(width-1), (z+1)/(depth-1)),
                        new THREE.Vector2((x)/(width-1), (z)/(depth-1))]);
                }
            }
            spawnModels();
            createCurve();
            var loader = new THREE.TextureLoader();
            var tex = loader.load( 'pics/rock_texture.jpg' );

            //geom.translate(-depth/2, 0, -width/2);

            geom.computeVertexNormals();
            geom.computeFaceNormals();

            mesh = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({
                map:tex,
                wireframe: false,
                side:THREE.DoubleSide
            }));
            mesh.receiveShadow = true;
            //mesh.castShadow = true;
            scene.add(mesh);

            ///////////////////////////////////////////////////////////// sky

            var geometry = new THREE.SphereGeometry( 1500, 32, 32 );
            
            tex = loader.load( 'pics/sky.jpg' );
            //tex.minFilter = THREE.NearestFilter;
            var material = new THREE.MeshBasicMaterial({
                map: tex,
                side: THREE.DoubleSide
               });
            var sphere = new THREE.Mesh( geometry, material );
            sphere.position = new THREE.Vector3(N/2, -1000, N/2);
            scene.add(sphere);
        };
   
}


function loadModel(path, oname, mname, count)
{
    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };
    var onError = function ( xhr ) { };

    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(path );

    mtlLoader.load( mname, function( materials )
    {
        materials.preload();

        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials( materials );
        objLoader.setPath( path );

        objLoader.load( oname, function ( object )
        {
            for(var i = 0; i<count; i++){
                var x = Math.random() * N;
                var z = Math.random() * N;
                var y = calcHeight(x, z);
                object.position.x = x;
                object.position.y = y;
                object.position.z = z;

                object.scale.set(0.2, 0.2, 0.2);
                object.traverse( function ( child )
                {
                if ( child instanceof THREE.Mesh )
                {
                child.castShadow = true;
                }
                } );

                model = object;
                //model.receiveShadow = true;
                model.castShadow = true;
                scene.add( model.clone() );
            }

        }, onProgress, onError );
    });
}


var mixer, morphs = [];

function loadAnimatedModel(path, count)
{
    var loader = new THREE.GLTFLoader();
    var onLoad = ( gltf ) => {
        var x = Math.random() * N;
        var z = Math.random() * N;
        var y = calcHeight(x, z);

        var mesh = gltf.scene.children[ 0 ];
        var clip = gltf.animations[ 0 ];

        mixer.clipAction( clip, mesh ).setDuration( 1 ).startAt( 0 ).play();
        mesh.position.set( x,y,z );
        //mesh.rotation.y = Math.PI / 8;
        mesh.scale.set( 0.2, 0.2, 0.2 );

        mesh.castShadow = true;
        //mesh.receiveShadow = true;
        mesh.traverse( function ( child )
        {
        if ( child instanceof THREE.Mesh )
        {
        child.castShadow = true;
        }
        } );

        scene.add( mesh );
        morphs.push( mesh );
        
    };
    for(var i = 0; i< count; i++){
        loader.load( path, gltf => onLoad( gltf) );
    }
}

function calcHeight(x, z){
    return geom.vertices[Math.round(x) + Math.round(z) * N].y;
}


function randomVector3(){
    var x = Math.random() * N;
    var z = Math.random() * N;
    var y = calcHeight(x, z);
    return new THREE.Vector3(x, y, z); 
}

async function spawnModels(){
    loadModel('models/', 'Tree.obj', 'Tree.mtl', 30);
    loadAnimatedModel('models/Horse.glb', 2);
    loadAnimatedModel('models/Stork.glb', 1);
}

var paths = [];

function createCurve(){
    var path;
    ////////////////////////////////////////////////// horse
    var curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(250, 3, 50), //P0
        new THREE.Vector3(500, 3, 50), //P1
        new THREE.Vector3(500, 3, 450), //P2
        new THREE.Vector3(250, 3, 450) //P3
    );

    var curve2 = new THREE.CubicBezierCurve3(
        new THREE.Vector3(250, 3, 450), //P0
        new THREE.Vector3(50, 3, 450), //P2
        new THREE.Vector3(50, 3, 50), //P1
        new THREE.Vector3(250, 3, 50) //P3
    ); 
    var vertices = [];
    
    vertices = curve.getPoints( 20 );
    vertices = vertices.concat(curve2.getPoints(20))
    path = new THREE.CatmullRomCurve3(vertices);
    
    path.closed = true;
    var geometry = new THREE.Geometry();
    geometry.vertices = vertices;
    // var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
    // var curveObject = new THREE.Line( geometry, material );
    // scene.add(curveObject);
    paths[0] = paths[1] = path;

    /////////////////////////////////////////////////// stork
    curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(220, 55, 100), //P0
        new THREE.Vector3(300, 100, 100), //P1
        new THREE.Vector3(300, 100, 300), //P2
        new THREE.Vector3(200, 55, 400) //P3
    );

    curve2 = new THREE.CubicBezierCurve3(
        new THREE.Vector3(180, 50, 400), //P0
        new THREE.Vector3(100, 40, 400), //P2
        new THREE.Vector3(100, 40, 100), //P1
        new THREE.Vector3(200, 50, 100) //P3
    ); 
    vertices = curve.getPoints( 20 );
    vertices = vertices.concat(curve2.getPoints(20))
    path = new THREE.CatmullRomCurve3(vertices);
    path.closed = true;
    geometry.vertices = vertices;
    // material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
    // curveObject = new THREE.Line( geometry, material );
    // scene.add(curveObject);
    paths[2] = path;
}

////////////////////////////////////////////////////
function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function cameraMovement(num){
    
    if(num == 0){
        camera.position.set(500, 500, 0);
        camera.lookAt(new THREE.Vector3( N/2, 0, N/2));
    }else{
        num--;
        relativeCameraOffset = new THREE.Vector3(0,50,-150);
        var m1 = new THREE.Matrix4();
        var m2 = new THREE.Matrix4();
        m1.extractRotation(morphs[num].matrixWorld);
        m2.copyPosition(morphs[num].matrixWorld);
        m1.multiplyMatrices(m2, m1);
        var cameraOffset = relativeCameraOffset.applyMatrix4(m1);
        camera.position.copy(cameraOffset);
        camera.lookAt(morphs[num].position );
    }
}



function animate()
{
    requestAnimationFrame( animate );
    render();
    var delta = clock.getDelta();
    
    mixer.update( delta );
    
    for ( var i = 0; i < morphs.length; i ++ )
    {
        var morph = morphs[ i ];
        var pos = new THREE.Vector3();
        t[i]+=delta;
        if(t[i] >= T) t[i]=0;
        pos.copy(paths[i].getPointAt((t[i]/T)));

        morph.position.copy(pos);
        
        if((t[i]+0.001)>= T) t[i] = 0;

        var nextPoint = new THREE.Vector3();
        nextPoint.copy(paths[i].getPointAt((t[i] + 0.001)/T));

        morph.lookAt(nextPoint);
    }

    keyboard.pressed("1") ? cameraMovement(1) :
    keyboard.pressed("2") ? cameraMovement(2) :
    keyboard.pressed("3") ? cameraMovement(3) :
     cameraMovement(0);
    
}


function render()
{
    renderer.render( scene, camera );

}




init();
animate();